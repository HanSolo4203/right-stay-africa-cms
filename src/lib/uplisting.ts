const UPLISTING_LISTINGS_BASE_URL = (
  process.env.UPLISTING_API_URL ?? 'https://connect.uplisting.io'
).replace(/\/$/, '');

export const UPLISTING_BOOKINGS_BASE_URL = 'https://connect.uplisting.io';

export const MIN_CHECK_IN_DATE = '2025-12-01';

export const UPLISTING_BOOKINGS_DATE_TO = '2026-12-31';

export interface UplistingListing {
  id: string;
  name: string;
  internal_name: string;
}

export interface UplistingBooking {
  id: number;
  guest_name: string;
  preferred_guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  channel: string;
  source: string | null;
  note: string | null;
  direct: boolean;
  booked_at: string;
  check_in: string;
  check_out: string;
  arrival_time: string;
  departure_time: string;
  number_of_nights: number;
  number_of_guests: number;
  property_name: string;
  property_id: number;
  currency: string;
  external_reservation_id: string;
  accomodation_total: number;
  cleaning_fee: number;
  extra_guest_charges: number;
  extra_charges: number;
  discounts: number;
  booking_taxes: number;
  commission: number;
  commission_vat: number;
  other_charges: number | null;
  total_payout: number;
  cancellation_fee: number | null;
  gross_revenue: number;
  accommodation_management_fee: number | null;
  cleaning_management_fee: number | null;
  total_management_fee: number;
  payment_processing_fee: number;
  net_revenue: number;
  balance: number;
  status: string;
}

export interface UplistingBookingsResponse {
  bookings: UplistingBooking[];
  meta: { total_pages: number; total: number };
}

type JsonApiResource = {
  id: string | number;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: { id?: string | number } | null } | undefined
  >;
};

type JsonApiPayload = {
  data?: unknown;
  links?: { next?: string | null };
};

/** Uplisting uses HTTP Basic auth with the raw API key Base64-encoded (not Bearer). */
function uplistingRequestHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function getApiKey(): string {
  const key = process.env.UPLISTING_API_KEY?.trim();
  if (!key) {
    throw new Error('UPLISTING_API_KEY is not defined');
  }
  return key;
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value);
}

function toString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return fallback;
}

function extractResources(payload: unknown): JsonApiResource[] {
  if (Array.isArray(payload)) {
    return payload as JsonApiResource[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data as JsonApiResource[];
  }

  for (const key of ['listings', 'bookings', 'properties']) {
    if (Array.isArray(record[key])) {
      return record[key] as JsonApiResource[];
    }
  }

  return [];
}

function getRelationshipId(
  resource: JsonApiResource,
  relationshipName: string
): string | null {
  const related = resource.relationships?.[relationshipName]?.data;
  if (!related || related.id === undefined || related.id === null) {
    return null;
  }
  return String(related.id);
}

function getAttribute(resource: JsonApiResource, ...keys: string[]): unknown {
  const attributes = resource.attributes ?? {};
  for (const key of keys) {
    if (attributes[key] !== undefined && attributes[key] !== null) {
      return attributes[key];
    }
  }
  return undefined;
}

function normalizeListing(resource: JsonApiResource | UplistingListing): UplistingListing {
  if ('attributes' in resource && resource.attributes) {
    return {
      id: String(resource.id),
      name: String(getAttribute(resource, 'name') ?? ''),
      internal_name: String(
        getAttribute(resource, 'internal_name', 'nickname') ?? ''
      ),
    };
  }

  const listing = resource as UplistingListing;
  return {
    id: String(listing.id),
    name: String(listing.name ?? ''),
    internal_name: String(listing.internal_name ?? ''),
  };
}

function bookingFromFlatRecord(record: Record<string, unknown>): UplistingBooking {
  const propertyId = toNumber(
    record.property_id ?? record.listing_id,
    0
  );

  return {
    id: toNumber(record.id, 0),
    guest_name: toString(record.guest_name, 'Unknown Guest'),
    preferred_guest_name: toStringOrNull(record.preferred_guest_name),
    guest_email: toStringOrNull(record.guest_email),
    guest_phone: toStringOrNull(record.guest_phone),
    channel: toString(record.channel, 'Unknown'),
    source: toStringOrNull(record.source),
    note: toStringOrNull(record.note),
    direct: toBoolean(record.direct),
    booked_at: toString(record.booked_at),
    check_in: toString(record.check_in ?? record.check_in_date),
    check_out: toString(record.check_out ?? record.check_out_date),
    arrival_time: toString(record.arrival_time),
    departure_time: toString(record.departure_time),
    number_of_nights: toNumber(record.number_of_nights),
    number_of_guests: toNumber(record.number_of_guests),
    property_name: toString(record.property_name),
    property_id: propertyId,
    currency: toString(record.currency),
    external_reservation_id: toString(
      record.external_reservation_id ?? record.booking_reference
    ),
    accomodation_total: toNumber(
      record.accomodation_total ?? record.accommodation_total
    ),
    cleaning_fee: toNumber(record.cleaning_fee),
    extra_guest_charges: toNumber(record.extra_guest_charges),
    extra_charges: toNumber(record.extra_charges),
    discounts: toNumber(record.discounts ?? record.discount_amount),
    booking_taxes: toNumber(record.booking_taxes ?? record.taxes),
    commission: toNumber(
      record.commission ?? record.channel_commission
    ),
    commission_vat: toNumber(record.commission_vat),
    other_charges: toNumberOrNull(record.other_charges),
    total_payout: toNumber(record.total_payout),
    cancellation_fee: toNumberOrNull(record.cancellation_fee),
    gross_revenue: toNumber(record.gross_revenue),
    accommodation_management_fee: toNumberOrNull(
      record.accommodation_management_fee
    ),
    cleaning_management_fee: toNumberOrNull(record.cleaning_management_fee),
    total_management_fee: toNumber(record.total_management_fee),
    payment_processing_fee: toNumber(record.payment_processing_fee),
    net_revenue: toNumber(record.net_revenue),
    balance: toNumber(record.balance),
    status: toString(record.status),
  };
}

/** Normalize webhook JSON:API or flat Connect API booking payloads. */
export function normalizeBooking(
  resource: JsonApiResource | UplistingBooking | Record<string, unknown>
): UplistingBooking {
  if ('attributes' in resource && resource.attributes) {
    const jsonResource = resource as JsonApiResource;
    const propertyId =
      getRelationshipId(jsonResource, 'listing') ??
      getRelationshipId(jsonResource, 'property') ??
      toStringOrNull(getAttribute(jsonResource, 'listing_id', 'property_id'));

    const flat: Record<string, unknown> = {
      id: jsonResource.id,
      property_id: propertyId,
      guest_name: getAttribute(jsonResource, 'guest_name'),
      preferred_guest_name: getAttribute(
        jsonResource,
        'preferred_guest_name'
      ),
      guest_email: getAttribute(jsonResource, 'guest_email'),
      guest_phone: getAttribute(jsonResource, 'guest_phone'),
      channel: getAttribute(jsonResource, 'channel', 'source', 'booking_source'),
      source: getAttribute(jsonResource, 'source'),
      note: getAttribute(jsonResource, 'note'),
      direct: getAttribute(jsonResource, 'direct'),
      booked_at: getAttribute(jsonResource, 'booked_at', 'created_at'),
      check_in: getAttribute(jsonResource, 'check_in', 'check_in_date'),
      check_out: getAttribute(jsonResource, 'check_out', 'check_out_date'),
      arrival_time: getAttribute(jsonResource, 'arrival_time'),
      departure_time: getAttribute(jsonResource, 'departure_time'),
      number_of_nights: getAttribute(jsonResource, 'number_of_nights'),
      number_of_guests: getAttribute(jsonResource, 'number_of_guests'),
      property_name: getAttribute(jsonResource, 'property_name'),
      currency: getAttribute(jsonResource, 'currency'),
      external_reservation_id: getAttribute(
        jsonResource,
        'external_reservation_id',
        'booking_reference',
        'external_reference'
      ),
      accomodation_total: getAttribute(
        jsonResource,
        'accomodation_total',
        'accommodation_total'
      ),
      cleaning_fee: getAttribute(jsonResource, 'cleaning_fee'),
      extra_guest_charges: getAttribute(jsonResource, 'extra_guest_charges'),
      extra_charges: getAttribute(jsonResource, 'extra_charges'),
      discounts: getAttribute(jsonResource, 'discounts', 'discount_amount'),
      booking_taxes: getAttribute(jsonResource, 'booking_taxes', 'taxes'),
      commission: getAttribute(
        jsonResource,
        'commission',
        'channel_commission',
        'booking_site_commission'
      ),
      commission_vat: getAttribute(jsonResource, 'commission_vat'),
      other_charges: getAttribute(jsonResource, 'other_charges'),
      total_payout: getAttribute(
        jsonResource,
        'total_payout',
        'net_booking_amount',
        'payout'
      ),
      cancellation_fee: getAttribute(jsonResource, 'cancellation_fee'),
      gross_revenue: getAttribute(jsonResource, 'gross_revenue'),
      accommodation_management_fee: getAttribute(
        jsonResource,
        'accommodation_management_fee'
      ),
      cleaning_management_fee: getAttribute(
        jsonResource,
        'cleaning_management_fee'
      ),
      total_management_fee: getAttribute(
        jsonResource,
        'total_management_fee'
      ),
      payment_processing_fee: getAttribute(
        jsonResource,
        'payment_processing_fee'
      ),
      net_revenue: getAttribute(jsonResource, 'net_revenue'),
      balance: getAttribute(jsonResource, 'balance'),
      status: getAttribute(jsonResource, 'status'),
    };

    return bookingFromFlatRecord(flat);
  }

  if (resource && typeof resource === 'object') {
    return bookingFromFlatRecord(resource as Record<string, unknown>);
  }

  throw new Error('Invalid Uplisting booking payload');
}

async function uplistingListingsFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
  init?: RequestInit
): Promise<T> {
  const url = new URL(`${UPLISTING_LISTINGS_BASE_URL}${path}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      ...uplistingRequestHeaders(getApiKey()),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Uplisting API request failed (${response.status} ${response.statusText}) for ${path}${
        body ? `: ${body}` : ''
      }`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function uplistingListingsFetchUrl<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: uplistingRequestHeaders(getApiKey()),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Uplisting API request failed (${response.status} ${response.statusText})${
        body ? `: ${body}` : ''
      }`
    );
  }

  return response.json() as Promise<T>;
}

async function uplistingBookingsFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(`${UPLISTING_BOOKINGS_BASE_URL}${path}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: uplistingRequestHeaders(getApiKey()),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Uplisting bookings API request failed (${response.status} ${response.statusText}) for ${path}${
        body ? `: ${body}` : ''
      }`
    );
  }

  return response.json() as Promise<T>;
}

async function fetchAllListingsPages(
  initialPath: string,
  searchParams?: Record<string, string | number | undefined>
): Promise<JsonApiResource[]> {
  const initialUrl = new URL(`${UPLISTING_LISTINGS_BASE_URL}${initialPath}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        initialUrl.searchParams.set(key, String(value));
      }
    }
  }

  const resources: JsonApiResource[] = [];
  let nextUrl: string | null = initialUrl.toString();

  while (nextUrl) {
    const payload: JsonApiPayload =
      await uplistingListingsFetchUrl<JsonApiPayload>(nextUrl);
    resources.push(...extractResources(payload));
    const following = payload.links?.next;
    nextUrl =
      typeof following === 'string' && following.length > 0 ? following : null;
  }

  return resources;
}

export async function fetchListings(): Promise<UplistingListing[]> {
  const resources = await fetchAllListingsPages('/properties', {
    'page[number]': 1,
    'page[size]': 100,
  });
  return resources.map(normalizeListing);
}

export async function fetchBookingsForListing(
  listingId: string | number
): Promise<UplistingBooking[]> {
  const allBookings: UplistingBooking[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const payload = await uplistingBookingsFetch<UplistingBookingsResponse>(
      `/bookings/${listingId}`,
      {
        from: MIN_CHECK_IN_DATE,
        to: UPLISTING_BOOKINGS_DATE_TO,
        page: page > 1 ? page : undefined,
      }
    );

    allBookings.push(...(payload.bookings ?? []));
    totalPages = Math.max(1, payload.meta?.total_pages ?? 1);
    page += 1;
  } while (page <= totalPages);

  return allBookings;
}

/**
 * Fetch a single booking by Uplisting booking id.
 * Falls back to scanning a property's bookings when the direct endpoint
 * is unavailable or returns a listing-shaped payload.
 */
export async function fetchBookingById(
  bookingId: string | number,
  propertyIdHint?: string | number | null
): Promise<UplistingBooking | null> {
  const id = String(bookingId);

  try {
    const payload = await uplistingBookingsFetch<unknown>(`/bookings/${id}`);
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;

      // Listing-scoped response shape — not a single booking.
      if (!Array.isArray(record.bookings)) {
        if (record.data && typeof record.data === 'object') {
          return normalizeBooking(record.data as Record<string, unknown>);
        }
        if (record.id != null) {
          return normalizeBooking(record);
        }
      }
    }
  } catch {
    // Direct lookup is optional; fall through to listing scan.
  }

  const listingId = propertyIdHint != null ? String(propertyIdHint) : null;
  if (!listingId) {
    return null;
  }

  try {
    const bookings = await fetchBookingsForListing(listingId);
    return bookings.find((booking) => String(booking.id) === id) ?? null;
  } catch {
    return null;
  }
}

/** Quick connectivity check — same request as Uplisting’s documented test. */
export async function testUplistingConnection(): Promise<{
  ok: boolean;
  propertyCount: number;
}> {
  const payload = await uplistingListingsFetch<JsonApiPayload>('/properties');
  const count = extractResources(payload).length;
  return { ok: true, propertyCount: count };
}

const BOOKING_WEBHOOK_EVENTS = [
  'booking_created',
  'booking_updated',
  'booking_removed',
] as const;

export type UplistingWebhookEvent = (typeof BOOKING_WEBHOOK_EVENTS)[number];

export type EnsuredUplistingWebhook = {
  id: string;
  event: string;
  target_url: string;
};

export type ListedUplistingWebhook = {
  id: string;
  event: string;
  target_url: string;
  disabled?: boolean;
};

function getAppBaseUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    ''
  ).replace(/\/$/, '');
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is not defined (needed to register Uplisting webhooks)'
    );
  }
  return base;
}

function getWebhookBasePath(): string {
  return `${getAppBaseUrl()}/api/uplisting/webhook`;
}

/**
 * Webhook URL registered with Uplisting.
 * Includes ?token= when UPLISTING_WEBHOOK_TOKEN is set (Connect auth fallback).
 * Note: Uplisting does not accept a signing secret at registration — the
 * Connect → Webhooks key (UPLISTING_WEBHOOK_SECRET) is only used for HMAC
 * verification when signature headers are present on delivery.
 */
export function getWebhookTargetUrl(): string {
  const basePath = getWebhookBasePath();
  const token = process.env.UPLISTING_WEBHOOK_TOKEN?.trim();
  if (!token) {
    return basePath;
  }
  const url = new URL(basePath);
  url.searchParams.set('token', token);
  return url.toString();
}

function isOurWebhookUrl(hookUrl: string): boolean {
  const basePath = getWebhookBasePath();
  try {
    const incoming = new URL(hookUrl);
    const ours = new URL(basePath);
    return (
      incoming.origin === ours.origin && incoming.pathname === ours.pathname
    );
  } catch {
    return hookUrl === basePath || hookUrl.startsWith(`${basePath}?`);
  }
}

function hookFromResource(resource: JsonApiResource): ListedUplistingWebhook {
  const attributes = (resource.attributes ?? {}) as Record<string, unknown>;
  return {
    id: String(resource.id),
    event: toString(attributes.event ?? attributes.event_name),
    target_url: toString(attributes.target_url),
    disabled:
      typeof attributes.disabled === 'boolean'
        ? attributes.disabled
        : attributes.enabled === false
          ? true
          : undefined,
  };
}

export async function listUplistingWebhooks(): Promise<ListedUplistingWebhook[]> {
  const existing = await uplistingListingsFetch<JsonApiPayload>('/hooks');
  return extractResources(existing).map(hookFromResource);
}

/**
 * Ensure booking create/update/remove hooks point at this app.
 * Deletes any prior hooks aimed at this webhook path (with or without token),
 * then recreates them so Uplisting re-enables delivery after prior failures.
 */
export async function ensureUplistingWebhooks(): Promise<{
  targetUrl: string;
  removed: number;
  created: EnsuredUplistingWebhook[];
  listed: ListedUplistingWebhook[];
}> {
  const targetUrl = getWebhookTargetUrl();
  const existing = await listUplistingWebhooks();

  let removed = 0;
  for (const hook of existing) {
    if (!isOurWebhookUrl(hook.target_url)) {
      continue;
    }
    await uplistingListingsFetch(`/hooks/${hook.id}`, undefined, {
      method: 'DELETE',
    });
    removed += 1;
  }

  const created: EnsuredUplistingWebhook[] = [];
  for (const event of BOOKING_WEBHOOK_EVENTS) {
    const result = await uplistingListingsFetch<{ id?: string | number }>(
      '/hooks',
      undefined,
      {
        method: 'POST',
        body: JSON.stringify({
          target_url: targetUrl,
          event,
        }),
      }
    );
    created.push({
      id: String(result.id ?? ''),
      event,
      target_url: targetUrl,
    });
  }

  const listed = await listUplistingWebhooks();
  return { targetUrl, removed, created, listed };
}
