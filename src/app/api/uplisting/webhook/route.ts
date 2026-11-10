import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';
import {
  cancelUplistingBooking,
  upsertUplistingBooking,
} from '@/lib/uplisting-sync';
import {
  MIN_CHECK_IN_DATE,
  normalizeBooking,
  type UplistingBooking,
} from '@/lib/uplisting';

export const dynamic = 'force-dynamic';

type WebhookEnvelope = {
  type?: string;
  event?: string;
  data?: unknown;
  booking?: unknown;
  payload?: unknown;
};

function verifyUplistingSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.trim()) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const received = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(received, 'hex');
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    const expectedUtf8 = Buffer.from(expected);
    const receivedUtf8 = Buffer.from(received);
    if (expectedUtf8.length !== receivedUtf8.length) {
      return false;
    }
    return timingSafeEqual(expectedUtf8, receivedUtf8);
  }
}

function getEventType(event: WebhookEnvelope): string | null {
  const type = event.type ?? event.event;
  return type?.trim() ? type.trim() : null;
}

function extractBookingPayload(event: WebhookEnvelope): unknown {
  const data = event.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (record.booking !== undefined) {
      return record.booking;
    }
    if (record.id !== undefined || record.attributes !== undefined) {
      return data;
    }
  }
  return event.booking ?? event.payload ?? data ?? null;
}

function toRawPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

function parseBookingPayload(payload: unknown): UplistingBooking | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const booking = normalizeBooking(payload as UplistingBooking);
  if (!booking.id || !booking.property_id) {
    return null;
  }

  return booking;
}

async function processBookingEvent(
  eventType: 'booking_created' | 'booking_updated',
  booking: UplistingBooking,
  rawPayload: Record<string, unknown>
): Promise<void> {
  if (booking.check_in < MIN_CHECK_IN_DATE) {
    logger.debug(
      `[uplisting-webhook] skipping ${eventType} booking ${booking.id}: check_in ${booking.check_in} before ${MIN_CHECK_IN_DATE}`
    );
    return;
  }

  const supabase = createServiceClient();
  const result = await upsertUplistingBooking(supabase, booking, {
    source: 'uplisting_webhook',
    rawPayload,
    eventType,
  });

  if (!result.ok) {
    throw new Error(result.error ?? `Failed to process ${eventType}`);
  }
}

async function processBookingRemovedEvent(
  booking: UplistingBooking,
  rawPayload: Record<string, unknown>
): Promise<void> {
  if (booking.check_in < MIN_CHECK_IN_DATE) {
    logger.debug(
      `[uplisting-webhook] skipping booking_removed ${booking.id}: check_in ${booking.check_in} before ${MIN_CHECK_IN_DATE}`
    );
    return;
  }

  const supabase = createServiceClient();
  const result = await cancelUplistingBooking(
    supabase,
    String(booking.id),
    rawPayload
  );

  if (!result.ok) {
    throw new Error(result.error ?? 'Failed to process booking_removed');
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.UPLISTING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('[uplisting-webhook] UPLISTING_WEBHOOK_SECRET is not defined');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-uplisting-signature');

  if (!verifyUplistingSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: WebhookEnvelope;
  try {
    event = JSON.parse(rawBody) as WebhookEnvelope;
  } catch (err) {
    logger.error('[uplisting-webhook] invalid JSON body', err);
    return NextResponse.json({ ok: true });
  }

  const eventType = getEventType(event);
  if (!eventType) {
    logger.warn('[uplisting-webhook] missing event type');
    return NextResponse.json({ ok: true });
  }

  const supported = new Set([
    'booking_created',
    'booking_updated',
    'booking_removed',
  ]);

  if (!supported.has(eventType)) {
    logger.debug(`[uplisting-webhook] ignoring unsupported event: ${eventType}`);
    return NextResponse.json({ ok: true });
  }

  const rawBookingPayload = extractBookingPayload(event);
  const booking = parseBookingPayload(rawBookingPayload);

  if (!booking) {
    logger.error(
      `[uplisting-webhook] could not parse booking for event ${eventType}`
    );
    return NextResponse.json({ ok: true });
  }

  const rawPayload = toRawPayload(rawBookingPayload);

  try {
    if (eventType === 'booking_created' || eventType === 'booking_updated') {
      await processBookingEvent(eventType, booking, rawPayload);
    } else if (eventType === 'booking_removed') {
      await processBookingRemovedEvent(booking, rawPayload);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(
      `[uplisting-webhook] processing failed for ${eventType} booking ${booking.id}:`,
      message
    );
  }

  return NextResponse.json({ ok: true });
}
