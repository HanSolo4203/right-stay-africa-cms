import type { UplistingBooking } from '@/lib/uplisting';
import { normalizeBooking } from '@/lib/uplisting';

export type WebhookEnvelope = {
  type?: string;
  event?: string;
  data?: unknown;
  booking?: unknown;
  payload?: unknown;
  id?: unknown;
  property_id?: unknown;
  listing_id?: unknown;
  check_in?: unknown;
  check_in_date?: unknown;
  status?: unknown;
  reason?: unknown;
  [key: string]: unknown;
};

export type ResolvedBookingEvent =
  | 'booking_created'
  | 'booking_updated'
  | 'booking_removed';

const REMOVAL_STATUSES = new Set([
  'cancelled',
  'canceled',
  'destroyed',
  'externally_removed',
  'removed_as_unpaid',
  'remove_pending',
]);

export function normalizeWebhookEventName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\./g, '_');
}

export function looksLikeBookingPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.id == null) {
    return false;
  }

  return (
    record.property_id != null ||
    record.listing_id != null ||
    record.check_in != null ||
    record.check_in_date != null ||
    record.guest_name != null ||
    (record.attributes != null && typeof record.attributes === 'object')
  );
}

export function isRemovalPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const reason = record.reason;
  // Connect booking_removed payloads include a reason field.
  if (reason != null && String(reason).trim() !== '') {
    return true;
  }

  const status = String(record.status ?? '')
    .toLowerCase()
    .trim();
  return REMOVAL_STATUSES.has(status);
}

export function extractBookingPayload(event: WebhookEnvelope): unknown {
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

  if (event.booking !== undefined) {
    return event.booking;
  }
  if (event.payload !== undefined) {
    return event.payload;
  }

  // Connect API posts a flat booking object (no type/event wrapper).
  if (looksLikeBookingPayload(event)) {
    return event;
  }

  return data ?? null;
}

export function extractBookingId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.id, record.booking_id, record.bookingId];
  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim() !== '') {
      return String(candidate);
    }
  }
  return null;
}

export function extractPropertyIdHint(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.property_id,
    record.listing_id,
    record.propertyId,
    record.listingId,
  ];
  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim() !== '') {
      return String(candidate);
    }
  }
  return null;
}

/** True when the payload lacks fields needed for a full calendar upsert. */
export function isThinBookingPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return true;
  }

  const record = payload as Record<string, unknown>;
  const hasId = extractBookingId(record) != null;
  const hasProperty =
    record.property_id != null ||
    record.listing_id != null ||
    (record.relationships != null && typeof record.relationships === 'object');
  const hasDates =
    record.check_in != null ||
    record.check_in_date != null ||
    (record.attributes != null &&
      typeof record.attributes === 'object' &&
      ((record.attributes as Record<string, unknown>).check_in != null ||
        (record.attributes as Record<string, unknown>).check_in_date != null));

  return !hasId || !hasProperty || !hasDates;
}

export function parseBookingPayload(payload: unknown): UplistingBooking | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const booking = normalizeBooking(payload as UplistingBooking);
  if (!booking.id || !booking.property_id) {
    return null;
  }

  return booking;
}

/**
 * Parse whatever we can from a webhook body. Id-only payloads are allowed
 * so the caller can enrich via the Uplisting API or cancel by booking id.
 */
export function parsePartialBookingPayload(
  payload: unknown
): UplistingBooking | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const bookingId = extractBookingId(payload);
  if (!bookingId) {
    return null;
  }

  const numericId = Number(bookingId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null;
  }

  try {
    const booking = normalizeBooking(payload as UplistingBooking);
    if (!booking.id) {
      booking.id = numericId;
    }
    if (!booking.property_id) {
      const hint = extractPropertyIdHint(payload);
      if (hint) {
        booking.property_id = Number(hint) || 0;
      }
    }
    return booking;
  } catch {
    return normalizeBooking({
      id: numericId,
      property_id: Number(extractPropertyIdHint(payload) ?? 0),
      guest_name: 'Unknown Guest',
      status: '',
    });
  }
}

export function resolveWebhookEventType(
  event: WebhookEnvelope,
  bookingPayload: unknown,
  headerEventType?: string | null
): ResolvedBookingEvent | null {
  const rawHeader = headerEventType?.trim();
  const rawBody =
    typeof event.type === 'string'
      ? event.type
      : typeof event.event === 'string'
        ? event.event
        : null;

  const raw = rawHeader || rawBody;
  if (raw) {
    const normalized = normalizeWebhookEventName(raw);
    if (
      normalized === 'booking_created' ||
      normalized === 'booking_updated' ||
      normalized === 'booking_removed'
    ) {
      return normalized;
    }
    if (
      normalized === 'booking_cancelled' ||
      normalized === 'booking_canceled'
    ) {
      return 'booking_removed';
    }
    return null;
  }

  // Flat Connect payloads omit event type; infer from booking fields.
  if (!looksLikeBookingPayload(bookingPayload)) {
    return null;
  }

  if (isRemovalPayload(bookingPayload)) {
    return 'booking_removed';
  }

  // Upsert path auto-detects created vs updated when eventType is omitted.
  return 'booking_updated';
}

export function toRawPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}
