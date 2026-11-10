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
