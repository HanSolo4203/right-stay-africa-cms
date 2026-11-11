import { createHmac, timingSafeEqual } from 'crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase';
import {
  cancelUplistingBooking,
  upsertUplistingBooking,
} from '@/lib/uplisting-sync';
import {
  extractBookingId,
  extractBookingPayload,
  extractPropertyIdHint,
  isRemovalPayload,
  isThinBookingPayload,
  parsePartialBookingPayload,
  resolveWebhookEventType,
  toRawPayload,
  type ResolvedBookingEvent,
} from '@/lib/uplisting-webhook';
import {
  fetchBookingById,
  MIN_CHECK_IN_DATE,
  type UplistingBooking,
} from '@/lib/uplisting';

export const dynamic = 'force-dynamic';

const DEBUG = () => process.env.UPLISTING_WEBHOOK_DEBUG === 'true';

/** Serialize per-booking webhook work so create/update/remove cannot race. */
const bookingQueues = new Map<string, Promise<void>>();

async function withBookingLock(
  bookingId: string,
  task: () => Promise<void>
): Promise<void> {
  const previous = bookingQueues.get(bookingId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.catch(() => undefined).then(() => gate);
  bookingQueues.set(bookingId, chained);

  await previous.catch(() => undefined);
  try {
    await task();
  } finally {
    release();
    if (bookingQueues.get(bookingId) === chained) {
      bookingQueues.delete(bookingId);
    }
  }
}

function safeEqualStrings(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

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

type SignatureCheck = {
  matched: boolean;
  bodyOnlyTried: boolean;
  stampedTried: boolean;
  reason: string;
};

function verifyUplistingSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  timestampHeader: string | null
): SignatureCheck {
  if (!signatureHeader?.trim()) {
    return {
      matched: false,
      bodyOnlyTried: false,
      stampedTried: false,
      reason: 'no_signature_header',
    };
  }

  const bodyOnly = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (signaturesMatch(bodyOnly, signatureHeader)) {
    return {
      matched: true,
      bodyOnlyTried: true,
      stampedTried: false,
      reason: 'hmac_body_ok',
    };
  }

  // V3-style signatures: HMAC(secret, `${timestamp}.${rawBody}`)
  if (timestampHeader?.trim()) {
    const stamped = createHmac('sha256', secret)
      .update(`${timestampHeader.trim()}.${rawBody}`, 'utf8')
      .digest('hex');
    if (signaturesMatch(stamped, signatureHeader)) {
      return {
        matched: true,
        bodyOnlyTried: true,
        stampedTried: true,
        reason: 'hmac_timestamp_body_ok',
      };
    }
    return {
      matched: false,
      bodyOnlyTried: true,
      stampedTried: true,
      reason: 'hmac_mismatch_body_and_stamped',
    };
  }

  return {
    matched: false,
    bodyOnlyTried: true,
    stampedTried: false,
    reason: 'hmac_mismatch_body_only_no_timestamp',
  };
}

function verifyWebhookToken(
  request: NextRequest,
  expectedToken: string | undefined
): { matched: boolean; reason: string } {
  if (!expectedToken) {
    return { matched: false, reason: 'token_not_configured' };
  }

  const provided = request.nextUrl.searchParams.get('token');
  if (!provided) {
    return { matched: false, reason: 'token_query_missing' };
  }

  if (!safeEqualStrings(provided, expectedToken)) {
    return { matched: false, reason: 'token_mismatch' };
  }

  return { matched: true, reason: 'token_ok' };
}

function headersForDebug(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower.includes('secret') ||
      lower.includes('authorization') ||
      lower.includes('cookie')
    ) {
      out[key] = '[redacted]';
      return;
    }
    out[key] = value;
  });
  return out;
}

function truncateBody(rawBody: string, max = 2048): string {
  if (rawBody.length <= max) {
    return rawBody;
  }
  return `${rawBody.slice(0, max)}…[truncated ${rawBody.length - max} bytes]`;
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

function isCancelledBooking(booking: UplistingBooking): boolean {
  return isRemovalPayload(booking) ||
    ['cancelled', 'canceled'].includes(
      String(booking.status ?? '').toLowerCase().trim()
    );
}

async function enrichBooking(
  rawBookingPayload: unknown,
  partial: UplistingBooking | null
): Promise<UplistingBooking | null> {
  if (partial && !isThinBookingPayload(rawBookingPayload)) {
    return partial.id && partial.property_id ? partial : null;
  }

  const bookingId =
    (partial?.id != null && String(partial.id) !== '0'
      ? String(partial.id)
      : null) ?? extractBookingId(rawBookingPayload);
  if (!bookingId) {
    return partial?.id && partial.property_id ? partial : null;
  }

  const propertyHint =
    (partial?.property_id ? String(partial.property_id) : null) ??
    extractPropertyIdHint(rawBookingPayload);

  console.log(
    `[uplisting-webhook] enriching thin payload booking=${bookingId} property_hint=${propertyHint ?? 'none'}`
  );

  const full = await fetchBookingById(bookingId, propertyHint);
  if (full) {
    return full;
  }

  // Cancel path can proceed with id alone.
  return partial;
}

async function processBookingEvent(
  eventType: 'booking_created' | 'booking_updated' | 'booking_removed',
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

  const treatAsRemoval =
    eventType === 'booking_removed' || isCancelledBooking(booking);

  if (treatAsRemoval) {
    const result = await cancelUplistingBooking(
      supabase,
      String(booking.id),
      rawPayload
    );
    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to process booking_removed');
    }
    console.log(
      `[uplisting-webhook] cancelled booking=${booking.id} changed=${result.cancelled}`
    );
    return;
  }

  const result = await upsertUplistingBooking(supabase, booking, {
    source: 'uplisting_webhook',
    rawPayload,
    eventType:
      eventType === 'booking_created' ? 'booking_created' : 'booking_updated',
  });

  if (!result.ok) {
    throw new Error(result.error ?? `Failed to process ${eventType}`);
  }

  console.log(
    `[uplisting-webhook] upserted booking=${booking.id} event=${result.eventType ?? eventType}`
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.UPLISTING_WEBHOOK_SECRET?.trim();
  const webhookToken = process.env.UPLISTING_WEBHOOK_TOKEN?.trim();

  if (!webhookSecret && !webhookToken) {
    logger.error(
      '[uplisting-webhook] neither UPLISTING_WEBHOOK_SECRET nor UPLISTING_WEBHOOK_TOKEN is defined'
    );
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get('x-uplisting-signature') ??
    request.headers.get('X-Uplisting-Signature');
  const timestamp =
    request.headers.get('x-uplisting-timestamp') ??
    request.headers.get('X-Uplisting-Timestamp');
  const headerEventType =
    request.headers.get('x-uplisting-event') ??
    request.headers.get('x-uplisting-event-type');

  if (DEBUG()) {
    console.log(
      `[uplisting-webhook] debug headers=${JSON.stringify(headersForDebug(request))}`
    );
    console.log(
      `[uplisting-webhook] debug body=${truncateBody(rawBody)}`
    );
  }

  let authMethod: string | null = null;
  let authFailureReason = 'no_auth_method_succeeded';

  if (webhookSecret && signature?.trim()) {
    const sigCheck = verifyUplistingSignature(
      rawBody,
      signature,
      webhookSecret,
      timestamp
    );
    if (sigCheck.matched) {
      authMethod = sigCheck.reason;
    } else {
      authFailureReason = sigCheck.reason;
      if (DEBUG()) {
        console.log(
          `[uplisting-webhook] debug signature_check failed reason=${sigCheck.reason} body_only=${sigCheck.bodyOnlyTried} stamped=${sigCheck.stampedTried}`
        );
      }
    }
  } else if (signature?.trim() && !webhookSecret) {
    authFailureReason = 'signature_present_but_secret_not_configured';
  } else if (!signature?.trim()) {
    authFailureReason = 'no_signature_header';
  }

  if (!authMethod) {
    const tokenCheck = verifyWebhookToken(request, webhookToken);
    if (tokenCheck.matched) {
      authMethod = tokenCheck.reason;
    } else {
      authFailureReason = `${authFailureReason}; ${tokenCheck.reason}`;
      if (DEBUG()) {
        console.log(
          `[uplisting-webhook] debug token_check failed reason=${tokenCheck.reason}`
        );
      }
    }
  }

  console.log(
    `[uplisting-webhook] hit bytes=${rawBody.length} signature=${Boolean(
      signature?.trim()
    )} timestamp=${Boolean(timestamp?.trim())} event_header=${
      headerEventType ?? 'none'
    } auth=${authMethod ?? 'rejected'}`
  );

  if (!authMethod) {
    logger.error(
      `[uplisting-webhook] auth failed (${authFailureReason})`
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const bookingIdEarly = extractBookingId(rawBookingPayload) ?? 'unknown';

  // Ack quickly; process after the response (Next.js 15 after()).
  after(async () => {
    await withBookingLock(bookingIdEarly, async () => {
      try {
        const partial = parsePartialBookingPayload(rawBookingPayload);
        const booking = await enrichBooking(rawBookingPayload, partial);

        if (!booking?.id) {
          logger.error(
            `[uplisting-webhook] could not resolve booking for event ${eventType} booking=${bookingIdEarly}`
          );
          return;
        }

        // Upserts need a property mapping; cancellations only need booking id.
        if (
          eventType !== 'booking_removed' &&
          !isCancelledBooking(booking) &&
          !booking.property_id
        ) {
          logger.error(
            `[uplisting-webhook] missing property_id for ${eventType} booking ${booking.id}`
          );
          return;
        }

        console.log(
          `[uplisting-webhook] accepted ${eventType} booking=${booking.id} property=${booking.property_id} guest=${booking.guest_name} auth=${authMethod}`
        );

        const rawPayload = toRawPayload(rawBookingPayload);
        await processBookingEvent(eventType, booking, rawPayload);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          `[uplisting-webhook] processing failed for ${eventType} booking ${bookingIdEarly}:`,
          message
        );
      }
    });
  });

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
