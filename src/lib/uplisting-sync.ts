import { createServiceClient } from '@/lib/supabase';
import {
  fetchBookingsForListing,
  fetchListings,
  type UplistingBooking,
  type UplistingListing,
} from '@/lib/uplisting';
import { isStaleWebhookPayload } from '@/lib/uplisting-webhook';

type ServiceClient = ReturnType<typeof createServiceClient>;

const LISTING_REQUEST_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBookingStatus(
  status: string
): 'pending' | 'confirmed' | 'cancelled' | 'completed' {
  const normalized = status.toLowerCase().trim();

  const statusMap: Record<
    string,
    'pending' | 'confirmed' | 'cancelled' | 'completed'
  > = {
    pending: 'pending',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    completed: 'completed',
    complete: 'completed',
    finished: 'completed',
    checked_out: 'completed',
    'checked out': 'completed',
    checkout: 'completed',
    needs_check_out: 'confirmed',
    'needs check out': 'confirmed',
    needs_checkout: 'confirmed',
    active: 'confirmed',
    in_progress: 'confirmed',
    'in progress': 'confirmed',
    current: 'confirmed',
    upcoming: 'confirmed',
    arriving: 'confirmed',
  };

  return statusMap[normalized] ?? 'confirmed';
}

function isCancelledStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return normalized === 'cancelled' || normalized === 'canceled';
}

function bookingReference(booking: UplistingBooking): string {
  const ref = booking.external_reservation_id?.trim();
  return ref || `UPL-${booking.id}`;
}

function guestDisplayName(booking: UplistingBooking): string {
  return (
    booking.preferred_guest_name?.trim() ||
    booking.guest_name?.trim() ||
    'Unknown Guest'
  );
}

async function upsertListing(
  supabase: ServiceClient,
  listing: UplistingListing
): Promise<{ ok: boolean; error?: string }> {
  const { data: updated, error: updateError } = await supabase
    .from('apartments')
    .update({ uplisting_name: listing.name })
    .eq('uplisting_id', listing.id)
    .select('id');

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (updated && updated.length > 0) {
    return { ok: true };
  }

  const { error: insertError } = await supabase.from('apartments').insert({
    uplisting_id: listing.id,
    uplisting_name: listing.name,
    apartment_number: listing.internal_name || listing.name || listing.id,
    owner_name: 'Uplisting',
  });

  if (insertError) {
    // Race: another sync may have inserted the same uplisting_id.
    const { data: existing, error: lookupError } = await supabase
      .from('apartments')
      .select('id')
      .eq('uplisting_id', listing.id)
      .maybeSingle();

    if (!lookupError && existing) {
      await supabase
        .from('apartments')
        .update({ uplisting_name: listing.name })
        .eq('id', existing.id);
      return { ok: true };
    }

    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

async function findApartmentIdByUplistingId(
  supabase: ServiceClient,
  uplistingId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('apartments')
    .select('id')
    .eq('uplisting_id', uplistingId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function upsertGuest(
  supabase: ServiceClient,
  booking: UplistingBooking
): Promise<string> {
  const name = guestDisplayName(booking);
  const email = booking.guest_email?.trim() || null;
  const phone = booking.guest_phone?.trim() || null;

  if (email) {
    const { data: upserted, error: upsertError } = await supabase
      .from('guests')
      .upsert({ email, name, phone }, { onConflict: 'email' })
      .select('id')
      .single();

    if (!upsertError && upserted) {
      return upserted.id;
    }

    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      await supabase.from('guests').update({ name, phone }).eq('id', existing.id);
      return existing.id;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('guests')
      .insert({ email, name, phone })
      .select('id')
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? 'Failed to create guest');
    }

    return inserted.id;
  }

  if (phone) {
    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      await supabase.from('guests').update({ name, email }).eq('id', existing.id);
      return existing.id;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('guests')
      .insert({ name, email, phone })
      .select('id')
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? 'Failed to create guest');
    }

    return inserted.id;
  }

  const { data: byName } = await supabase
    .from('guests')
    .select('id')
    .eq('name', name)
    .limit(1)
    .maybeSingle();

  if (byName) {
    return byName.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('guests')
    .insert({ name, email, phone })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? 'Failed to create guest');
  }

  return inserted.id;
}

async function findOrCreateChannelId(
  supabase: ServiceClient,
  channelName: string | null
): Promise<string | null> {
  if (!channelName?.trim()) {
    return null;
  }

  const normalizedName = channelName.trim();

  const { data: existing } = await supabase
    .from('booking_channels')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('booking_channels')
    .insert({
      name: normalizedName,
      commission_rate: 0,
      payment_processing_fee: 0,
    })
    .select('id')
    .single();

  if (error || !created) {
    console.warn(
      `[uplisting-sync] Could not create channel "${normalizedName}":`,
      error?.message
    );
    return null;
  }

  return created.id;
}

export type UplistingBookingSource = 'uplisting_api' | 'uplisting_webhook';

export type BookingSyncEventType =
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'sync_completed';

type ExistingBookingSnapshot = {
  id: string;
  booking_status: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  booking_reference: string | null;
};

type BookingSyncEventInput = {
  eventType: BookingSyncEventType;
  source: UplistingBookingSource | 'system';
  bookingId?: string | null;
  uplistingBookingId?: string | null;
  uplistingListingId?: string | null;
  apartmentId?: string | null;
  bookingReference?: string | null;
  guestName?: string | null;
  propertyName?: string | null;
  bookingStatus?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  summary: string;
  details?: Record<string, unknown>;
};

function buildBookingRow(
  booking: UplistingBooking,
  apartmentId: string,
  guestId: string,
  channelId: string | null,
  source: UplistingBookingSource,
  rawPayload: Record<string, unknown>
) {
  return {
    booking_reference: bookingReference(booking),
    apartment_id: apartmentId,
    guest_id: guestId,
    channel_id: channelId,
    check_in_date: booking.check_in,
    check_out_date: booking.check_out,
    accommodation_total: booking.accomodation_total,
    discount_amount: booking.discounts,
    extra_charges: booking.extra_charges,
    cleaning_fee: booking.cleaning_fee,
    booking_taxes: booking.booking_taxes,
    channel_commission: booking.commission,
    commission_tax: booking.commission_vat,
    payment_processing_fee: booking.payment_processing_fee,
    booking_status: normalizeBookingStatus(booking.status),
    source,
    raw_payload: rawPayload,
    uplisting_listing_id: String(booking.property_id),
    uplisting_booking_id: String(booking.id),
  };
}

async function getApartmentDisplayName(
  supabase: ServiceClient,
  apartmentId: string
): Promise<string> {
  const { data } = await supabase
    .from('apartments')
    .select('apartment_number, uplisting_name')
    .eq('id', apartmentId)
    .maybeSingle();

  return data?.uplisting_name || data?.apartment_number || 'Unknown property';
}

async function logBookingSyncEvent(
  supabase: ServiceClient,
  event: BookingSyncEventInput
): Promise<void> {
  const { error } = await supabase.from('booking_sync_events').insert({
    event_type: event.eventType,
    source: event.source,
    booking_id: event.bookingId ?? null,
    uplisting_booking_id: event.uplistingBookingId ?? null,
    uplisting_listing_id: event.uplistingListingId ?? null,
    apartment_id: event.apartmentId ?? null,
    booking_reference: event.bookingReference ?? null,
    guest_name: event.guestName ?? null,
    property_name: event.propertyName ?? null,
    booking_status: event.bookingStatus ?? null,
    check_in_date: event.checkInDate ?? null,
    check_out_date: event.checkOutDate ?? null,
    summary: event.summary,
    details: event.details ?? null,
  });

  if (error) {
    console.error('[uplisting-sync] failed to log booking sync event:', error.message);
  }
}

function bookingChanged(
  existing: ExistingBookingSnapshot,
  nextStatus: string,
  nextCheckIn: string,
  nextCheckOut: string,
  nextReference: string
): boolean {
  return (
    existing.booking_status !== nextStatus ||
    existing.check_in_date !== nextCheckIn ||
    existing.check_out_date !== nextCheckOut ||
    (existing.booking_reference ?? '') !== nextReference
  );
}

export async function upsertUplistingBooking(
  supabase: ServiceClient,
  booking: UplistingBooking,
  options: {
    source: UplistingBookingSource;
    rawPayload: Record<string, unknown>;
    eventType?: 'booking_created' | 'booking_updated';
  }
): Promise<{ ok: boolean; error?: string; eventType?: BookingSyncEventType }> {
  const apartmentId = await findApartmentIdByUplistingId(
    supabase,
    String(booking.property_id)
  );
  if (!apartmentId) {
    return {
      ok: false,
      error: `no apartment with uplisting_id=${booking.property_id}`,
    };
  }

  const uplistingBookingId = String(booking.id);
  const { data: existing } = await supabase
    .from('bookings')
    .select(
      'id, booking_status, check_in_date, check_out_date, booking_reference, raw_payload'
    )
    .eq('uplisting_booking_id', uplistingBookingId)
    .maybeSingle();

  if (
    options.source === 'uplisting_webhook' &&
    existing &&
    isStaleWebhookPayload(existing.raw_payload, options.rawPayload)
  ) {
    console.log(
      `[uplisting-sync] skipping stale webhook upsert booking=${uplistingBookingId}`
    );
    return { ok: true, eventType: undefined };
  }

  const guestId = await upsertGuest(supabase, booking);
  const channelId = await findOrCreateChannelId(supabase, booking.channel);
  const row = buildBookingRow(
    booking,
    apartmentId,
    guestId,
    channelId,
    options.source,
    options.rawPayload
  );

  const { data: upserted, error: upsertError } = await supabase
    .from('bookings')
    .upsert(row, { onConflict: 'uplisting_booking_id' })
    .select('id')
    .single();

  if (upsertError || !upserted) {
    return { ok: false, error: upsertError?.message ?? 'Failed to upsert booking' };
  }

  const nextStatus = row.booking_status;
  const reference = row.booking_reference;
  const guestName = guestDisplayName(booking);
  const propertyName = await getApartmentDisplayName(supabase, apartmentId);

  let eventType: BookingSyncEventType | null = null;
  if (!existing) {
    eventType = 'booking_created';
  } else if (
    options.source === 'uplisting_webhook' ||
    options.eventType === 'booking_updated' ||
    options.eventType === 'booking_created' ||
    bookingChanged(
      existing as ExistingBookingSnapshot,
      nextStatus,
      booking.check_in,
      booking.check_out,
      reference
    )
  ) {
    // Prefer updated when the row already exists (webhook create after sync, etc.).
    eventType = 'booking_updated';
  }

  if (eventType) {
    const verb =
      eventType === 'booking_created'
        ? options.source === 'uplisting_webhook'
          ? 'Webhook new booking'
          : 'New booking'
        : options.source === 'uplisting_webhook'
          ? 'Webhook updated booking'
          : 'Synced booking';

    await logBookingSyncEvent(supabase, {
      eventType,
      source: options.source,
      bookingId: upserted.id,
      uplistingBookingId,
      uplistingListingId: String(booking.property_id),
      apartmentId,
      bookingReference: reference,
      guestName,
      propertyName,
      bookingStatus: nextStatus,
      checkInDate: booking.check_in,
      checkOutDate: booking.check_out,
      summary: `${verb} ${reference} · ${guestName} · ${propertyName}`,
      details: {
        channel: booking.channel ?? null,
        previous_status: existing?.booking_status ?? null,
      },
    });
  }

  return { ok: true, eventType: eventType ?? undefined };
}

export async function cancelUplistingBooking(
  supabase: ServiceClient,
  uplistingBookingId: string,
  rawPayload: Record<string, unknown>,
  source: UplistingBookingSource = 'uplisting_webhook'
): Promise<{ ok: boolean; cancelled: boolean; error?: string }> {
  if (source === 'uplisting_webhook') {
    const { data: existing } = await supabase
      .from('bookings')
      .select('id, raw_payload')
      .eq('uplisting_booking_id', uplistingBookingId)
      .maybeSingle();

    if (existing && isStaleWebhookPayload(existing.raw_payload, rawPayload)) {
      console.log(
        `[uplisting-sync] skipping stale webhook cancel booking=${uplistingBookingId}`
      );
      return { ok: true, cancelled: false };
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({
      booking_status: 'cancelled',
      source,
      raw_payload: rawPayload,
    })
    .eq('uplisting_booking_id', uplistingBookingId)
    .neq('booking_status', 'cancelled')
    .select(
      `
      id,
      booking_reference,
      check_in_date,
      check_out_date,
      apartment_id,
      uplisting_listing_id,
      guests ( name ),
      apartments ( apartment_number, uplisting_name )
    `
    );

  if (error) {
    return { ok: false, cancelled: false, error: error.message };
  }

  const cancelledRows = data ?? [];
  if (cancelledRows.length === 0) {
    return { ok: true, cancelled: false };
  }

  for (const row of cancelledRows) {
    const apartments = row.apartments as
      | { apartment_number: string; uplisting_name: string | null }
      | { apartment_number: string; uplisting_name: string | null }[]
      | null;
    const apartment = Array.isArray(apartments) ? apartments[0] : apartments;
    const guests = row.guests as { name: string } | { name: string }[] | null;
    const guest = Array.isArray(guests) ? guests[0] : guests;
    const propertyName =
      apartment?.uplisting_name || apartment?.apartment_number || 'Unknown property';
    const guestName = guest?.name || 'Unknown Guest';
    const reference = row.booking_reference || `UPL-${uplistingBookingId}`;

    await logBookingSyncEvent(supabase, {
      eventType: 'booking_cancelled',
      source,
      bookingId: row.id,
      uplistingBookingId,
      uplistingListingId: row.uplisting_listing_id,
      apartmentId: row.apartment_id,
      bookingReference: reference,
      guestName,
      propertyName,
      bookingStatus: 'cancelled',
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      summary: `Cancelled booking ${reference} · ${guestName} · ${propertyName}`,
    });
  }

  return { ok: true, cancelled: true };
}

export async function logSyncCompletedEvent(
  supabase: ServiceClient,
  options: {
    scope: 'all' | 'property';
    propertyName?: string | null;
    uplistingListingId?: string | null;
    apartmentId?: string | null;
    synced: number;
    skipped: number;
    cancelled: number;
    errors: string[];
  }
): Promise<void> {
  const scopeLabel =
    options.scope === 'property'
      ? options.propertyName || options.uplistingListingId || 'property'
      : 'all linked properties';

  await logBookingSyncEvent(supabase, {
    eventType: 'sync_completed',
    source: 'uplisting_api',
    uplistingListingId: options.uplistingListingId ?? null,
    apartmentId: options.apartmentId ?? null,
    propertyName: options.propertyName ?? null,
    summary: `Manual sync finished for ${scopeLabel}: ${options.synced} synced, ${options.cancelled} cancelled, ${options.skipped} skipped`,
    details: {
      scope: options.scope,
      synced: options.synced,
      skipped: options.skipped,
      cancelled: options.cancelled,
      error_count: options.errors.length,
      errors: options.errors.slice(0, 10),
    },
  });
}

export async function syncListings(): Promise<{
  synced: number;
  errors: string[];
}> {
  console.log('[uplisting-sync] syncListings: fetching listings from Uplisting API');
  const errors: string[] = [];
  let synced = 0;

  const listings = await fetchListings();
  console.log(`[uplisting-sync] syncListings: received ${listings.length} listings`);

  const supabase = createServiceClient();

  for (const listing of listings) {
    console.log(
      `[uplisting-sync] syncListings: upserting apartment uplisting_id=${listing.id}`
    );
    const result = await upsertListing(supabase, listing);
    if (result.ok) {
      synced += 1;
    } else {
      errors.push(`Listing ${listing.id}: ${result.error}`);
    }
  }

  console.log(
    `[uplisting-sync] syncListings: done synced=${synced} errors=${errors.length}`
  );

  return { synced, errors };
}

async function upsertBookingsForListing(
  supabase: ServiceClient,
  uplistingId: string,
  bookings: UplistingBooking[],
  apartmentByUplistingId: Map<string, string>
): Promise<{ synced: number; skipped: number; cancelled: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;
  let cancelled = 0;

  for (const booking of bookings) {
    if (isCancelledStatus(booking.status)) {
      // Previously we skipped cancelled bookings, which left stale "confirmed"
      // rows on the calendar after Uplisting cancelled them.
      const result = await cancelUplistingBooking(
        supabase,
        String(booking.id),
        booking as unknown as Record<string, unknown>,
        'uplisting_api'
      );

      if (!result.ok) {
        errors.push(`Booking ${booking.id}: ${result.error}`);
        skipped += 1;
        continue;
      }

      if (result.cancelled) {
        cancelled += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const apartmentId = apartmentByUplistingId.get(String(booking.property_id));
    if (!apartmentId) {
      errors.push(
        `Booking ${booking.id}: no apartment with uplisting_id=${booking.property_id}`
      );
      skipped += 1;
      continue;
    }

    try {
      const result = await upsertUplistingBooking(supabase, booking, {
        source: 'uplisting_api',
        rawPayload: booking as unknown as Record<string, unknown>,
      });

      if (!result.ok) {
        errors.push(`Booking ${booking.id}: ${result.error}`);
        skipped += 1;
        continue;
      }

      synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Booking ${booking.id}: ${message}`);
      skipped += 1;
    }
  }

  return { synced, skipped, cancelled, errors };
}

export async function syncBookingsForListing(uplistingId: string): Promise<{
  synced: number;
  skipped: number;
  cancelled: number;
  errors: string[];
}> {
  const supabase = createServiceClient();

  const { data: apartment, error: apartmentError } = await supabase
    .from('apartments')
    .select('id, uplisting_id, is_active')
    .eq('uplisting_id', uplistingId)
    .maybeSingle();

  if (apartmentError) {
    throw new Error(apartmentError.message);
  }

  if (!apartment) {
    throw new Error(`No apartment linked with uplisting_id=${uplistingId}`);
  }

  // Disabled properties are excluded from booking-date pulls.
  // Existing booking rows are left untouched in the database.
  if (apartment.is_active === false) {
    console.log(
      `[uplisting-sync] syncBookingsForListing: skipping disabled apartment for uplisting_id=${uplistingId} (keeping existing bookings)`
    );
    return { synced: 0, skipped: 0, cancelled: 0, errors: [] };
  }

  console.log(
    `[uplisting-sync] syncBookingsForListing: fetching bookings for listing ${uplistingId}`
  );

  const apartmentByUplistingId = new Map<string, string>([
    [String(uplistingId), apartment.id],
  ]);

  let bookings: UplistingBooking[];
  try {
    bookings = await fetchBookingsForListing(uplistingId);
    console.log(
      `[uplisting-sync] syncBookingsForListing: listing ${uplistingId} returned ${bookings.length} bookings`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Listing ${uplistingId}: ${message}`);
  }

  const result = await upsertBookingsForListing(
    supabase,
    uplistingId,
    bookings,
    apartmentByUplistingId
  );

  const propertyName = await getApartmentDisplayName(supabase, apartment.id);
  await logSyncCompletedEvent(supabase, {
    scope: 'property',
    propertyName,
    uplistingListingId: String(uplistingId),
    apartmentId: apartment.id,
    synced: result.synced,
    skipped: result.skipped,
    cancelled: result.cancelled,
    errors: result.errors,
  });

  console.log(
    `[uplisting-sync] syncBookingsForListing: done synced=${result.synced} skipped=${result.skipped} cancelled=${result.cancelled} errors=${result.errors.length}`
  );

  return result;
}

export async function syncBookings(): Promise<{
  synced: number;
  skipped: number;
  cancelled: number;
  errors: string[];
}> {
  console.log(
    '[uplisting-sync] syncBookings: fetching bookings per linked apartment'
  );
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;
  let cancelled = 0;

  const supabase = createServiceClient();

  // Only active apartments: disabled ones are not queried for new booking dates.
  // Their existing booking records remain in the database.
  const { data: apartments, error: apartmentsError } = await supabase
    .from('apartments')
    .select('id, uplisting_id')
    .eq('is_active', true)
    .not('uplisting_id', 'is', null);

  if (apartmentsError) {
    throw new Error(apartmentsError.message);
  }

  const apartmentByUplistingId = new Map<string, string>();
  for (const apartment of apartments ?? []) {
    if (apartment.uplisting_id) {
      apartmentByUplistingId.set(String(apartment.uplisting_id), apartment.id);
    }
  }

  const linkedApartments = apartments ?? [];
  console.log(
    `[uplisting-sync] syncBookings: ${linkedApartments.length} apartments with uplisting_id`
  );

  for (let index = 0; index < linkedApartments.length; index += 1) {
    const apartment = linkedApartments[index];
    const uplistingId = apartment.uplisting_id;

    if (!uplistingId) {
      continue;
    }

    if (index > 0) {
      await delay(LISTING_REQUEST_DELAY_MS);
    }

    let bookings: UplistingBooking[];
    try {
      bookings = await fetchBookingsForListing(uplistingId);
      console.log(
        `[uplisting-sync] syncBookings: listing ${uplistingId} returned ${bookings.length} bookings`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Listing ${uplistingId}: ${message}`);
      continue;
    }

    const result = await upsertBookingsForListing(
      supabase,
      uplistingId,
      bookings,
      apartmentByUplistingId
    );

    synced += result.synced;
    skipped += result.skipped;
    cancelled += result.cancelled;
    errors.push(...result.errors);
  }

  await logSyncCompletedEvent(supabase, {
    scope: 'all',
    synced,
    skipped,
    cancelled,
    errors,
  });

  console.log(
    `[uplisting-sync] syncBookings: done synced=${synced} skipped=${skipped} cancelled=${cancelled} errors=${errors.length}`
  );

  return { synced, skipped, cancelled, errors };
}
