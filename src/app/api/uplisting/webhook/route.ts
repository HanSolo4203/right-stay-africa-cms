import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';
import {
  cancelUplistingBooking,
  upsertUplistingBooking,
} from '@/lib/uplisting-sync';
import {
  extractBookingPayload,
  parseBookingPayload,
  resolveWebhookEventType,
  toRawPayload,
  type ResolvedBookingEvent,
} from '@/lib/uplisting-webhook';
import {
  MIN_CHECK_IN_DATE,
  type UplistingBooking,
} from '@/lib/uplisting';

export const dynamic = 'force-dynamic';

function signaturesMatch(expectedHex: string, received: string): boolean {
  const normalizedReceived = received.startsWith('sha256=')
    ? received.slice(7)
    : received;

  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const receivedBuf = Buffer.from(normalizedReceived, 'hex');
    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    const expectedUtf8 = Buffer.from(expectedHex);
    const receivedUtf8 = Buffer.from(normalizedReceived);
    if (expectedUtf8.length !== receivedUtf8.length) {
      return false;
    }
    return timingSafeEqual(expectedUtf8, receivedUtf8);
  }
}

function verifyUplistingSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  timestampHeader: string | null
): boolean {
  if (!signatureHeader?.trim()) {
    return false;
  }

  const bodyOnly = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (signaturesMatch(bodyOnly, signatureHeader)) {
    return true;
  }

  // V3-style signatures: HMAC(secret, `${timestamp}.${rawBody}`)
  if (timestampHeader?.trim()) {
    const stamped = createHmac('sha256', secret)
      .update(`${timestampHeader.trim()}.${rawBody}`, 'utf8')
      .digest('hex');
    if (signaturesMatch(stamped, signatureHeader)) {
      return true;
    }
  }

  return false;
}

function shouldSkipByCheckIn(
  booking: UplistingBooking,
  eventType: ResolvedBookingEvent
): boolean {
  if (!booking.check_in) {
    // Removals can arrive with a reduced payload; still cancel by booking id.
    return eventType !== 'booking_removed';
  }
  return booking.check_in < MIN_CHECK_IN_DATE;
}

async function processBookingEvent(
  eventType: 'booking_created' | 'booking_updated',
  booking: UplistingBooking,
  rawPayload: Record<string, unknown>
): Promise<void> {
  if (shouldSkipByCheckIn(booking, eventType)) {
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
  if (shouldSkipByCheckIn(booking, 'booking_removed')) {
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
  const timestamp = request.headers.get('x-uplisting-timestamp');
  const headerEventType =
    request.headers.get('x-uplisting-event') ??
    request.headers.get('x-uplisting-event-type');

  console.log(
    `[uplisting-webhook] hit bytes=${rawBody.length} signature=${Boolean(
      signature?.trim()
    )} timestamp=${Boolean(timestamp?.trim())} event_header=${
      headerEventType ?? 'none'
    }`
  );

  if (!verifyUplistingSignature(rawBody, signature, webhookSecret, timestamp)) {
    logger.error(
      `[uplisting-webhook] invalid signature (signature_present=${Boolean(
        signature?.trim()
      )} timestamp_present=${Boolean(timestamp?.trim())})`
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch (err) {
    logger.error('[uplisting-webhook] invalid JSON body', err);
    return NextResponse.json({ ok: true });
  }

  const rawBookingPayload = extractBookingPayload(event);
  const eventType = resolveWebhookEventType(
    event,
    rawBookingPayload,
    headerEventType
  );

  if (!eventType) {
    if (looksLikeUnsupportedEvent(event, headerEventType)) {
      logger.debug(
        `[uplisting-webhook] ignoring unsupported event: ${
          headerEventType ?? String(event.type ?? event.event)
        }`
      );
    } else {
      logger.warn('[uplisting-webhook] missing event type and booking payload');
    }
    return NextResponse.json({ ok: true });
  }

  const booking = parseBookingPayload(rawBookingPayload);

  if (!booking) {
    logger.error(
      `[uplisting-webhook] could not parse booking for event ${eventType}`
    );
    return NextResponse.json({ ok: true });
  }

  console.log(
    `[uplisting-webhook] accepted ${eventType} booking=${booking.id} property=${booking.property_id} guest=${booking.guest_name}`
  );

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

function looksLikeUnsupportedEvent(
  event: Record<string, unknown>,
  headerEventType: string | null
): boolean {
  const raw =
    headerEventType?.trim() ||
    (typeof event.type === 'string' ? event.type : null) ||
    (typeof event.event === 'string' ? event.event : null);
  return Boolean(raw?.trim());
}
