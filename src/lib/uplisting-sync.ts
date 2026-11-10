import { createServiceClient } from '@/lib/supabase';
import {
  fetchBookingsForListing,
  fetchListings,
  type UplistingBooking,
  type UplistingListing,
} from '@/lib/uplisting';

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
  const { error: upsertError } = await supabase.from('apartments').upsert(
    {
      uplisting_id: listing.id,
      uplisting_name: listing.name,
    },
    { onConflict: 'uplisting_id' }
  );

  if (!upsertError) {
    return { ok: true };
  }

  const { error: insertError } = await supabase.from('apartments').insert({
    uplisting_id: listing.id,
    uplisting_name: listing.name,
    apartment_number: listing.internal_name || listing.id,
    owner_name: 'Uplisting',
  });

  if (insertError) {
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

export async function upsertUplistingBooking(
  supabase: ServiceClient,
  booking: UplistingBooking,
  options: {
    source: UplistingBookingSource;
    rawPayload: Record<string, unknown>;
  }
): Promise<{ ok: boolean; error?: string }> {
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

  const { error: upsertError } = await supabase
    .from('bookings')
    .upsert(row, { onConflict: 'uplisting_booking_id' });

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  return { ok: true };
}

export async function cancelUplistingBooking(
  supabase: ServiceClient,
  uplistingBookingId: string,
  rawPayload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('bookings')
    .update({
      booking_status: 'cancelled',
      source: 'uplisting_webhook',
      raw_payload: rawPayload,
    })
    .eq('uplisting_booking_id', uplistingBookingId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
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
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (isCancelledStatus(booking.status)) {
      skipped += 1;
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
      const guestId = await upsertGuest(supabase, booking);
      const channelId = await findOrCreateChannelId(supabase, booking.channel);
      const row = buildBookingRow(
        booking,
        apartmentId,
        guestId,
        channelId,
        'uplisting_api',
        booking as unknown as Record<string, unknown>
      );

      const { error: upsertError } = await supabase
        .from('bookings')
        .upsert(row, { onConflict: 'uplisting_booking_id' });

      if (upsertError) {
        errors.push(`Booking ${booking.id}: ${upsertError.message}`);
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

  return { synced, skipped, errors };
}

export async function syncBookingsForListing(uplistingId: string): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  console.log(
    `[uplisting-sync] syncBookingsForListing: fetching bookings for listing ${uplistingId}`
  );

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

  if (apartment.is_active === false) {
    console.log(
      `[uplisting-sync] syncBookingsForListing: skipping disabled apartment for uplisting_id=${uplistingId}`
    );
    return { synced: 0, skipped: 0, errors: [] };
  }

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

  console.log(
    `[uplisting-sync] syncBookingsForListing: done synced=${result.synced} skipped=${result.skipped} errors=${result.errors.length}`
  );

  return result;
}

export async function syncBookings(): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  console.log(
    '[uplisting-sync] syncBookings: fetching bookings per linked apartment'
  );
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  const supabase = createServiceClient();

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
    errors.push(...result.errors);
  }

  console.log(
    `[uplisting-sync] syncBookings: done synced=${synced} skipped=${skipped} errors=${errors.length}`
  );

  return { synced, skipped, errors };
}
