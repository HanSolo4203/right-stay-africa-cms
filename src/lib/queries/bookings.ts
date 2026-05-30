import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase';

export interface BookingFilters {
  apartmentId?: string;
  fromDate?: string;
  toDate?: string;
  /** Include bookings overlapping [overlapFrom, overlapTo] (inclusive date strings YYYY-MM-DD) */
  overlapFrom?: string;
  overlapTo?: string;
  includeCancel?: boolean;
}

export interface BookingApartmentDetails {
  apartment_number: string;
  uplisting_id: string | null;
  uplisting_name: string | null;
  owner_name?: string;
}

export interface BookingGuestDetails {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface BookingChannelDetails {
  name: string;
}

export interface BookingWithDetails {
  id: string;
  booking_reference: string;
  apartment_id: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  booking_status: string;
  accommodation_total: number;
  discount_amount: number;
  cleaning_fee: number;
  channel_commission: number;
  total_payout: number;
  apartments: BookingApartmentDetails | null;
  guests: BookingGuestDetails | null;
  booking_channels: BookingChannelDetails | null;
}

export interface PropertyWithBookings {
  id: string;
  apartment_number: string;
  uplisting_id: string | null;
  uplisting_name: string | null;
}

const BOOKING_WITH_DETAILS_SELECT = `
  id,
  booking_reference,
  apartment_id,
  check_in_date,
  check_out_date,
  nights,
  booking_status,
  accommodation_total,
  discount_amount,
  cleaning_fee,
  channel_commission,
  total_payout,
  apartments (
    apartment_number,
    uplisting_id,
    uplisting_name,
    owner_name
  ),
  guests (
    name,
    email,
    phone
  ),
  booking_channels (
    name
  )
`;

export async function getBookingsWithDetails(
  supabase: SupabaseClient,
  filters?: BookingFilters
): Promise<BookingWithDetails[]> {
  let query = supabase
    .from(TABLES.BOOKINGS)
    .select(BOOKING_WITH_DETAILS_SELECT)
    .order('check_in_date', { ascending: true });

  if (filters?.apartmentId) {
    query = query.eq('apartment_id', filters.apartmentId);
  }

  if (filters?.overlapFrom && filters?.overlapTo) {
    query = query
      .lte('check_in_date', filters.overlapTo)
      .gte('check_out_date', filters.overlapFrom);
  } else {
    if (filters?.fromDate) {
      query = query.gte('check_in_date', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.lte('check_in_date', filters.toDate);
    }
  }

  if (filters?.includeCancel === false) {
    query = query.neq('booking_status', 'cancelled');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as BookingWithDetails[];
}

export async function getBookingById(
  supabase: SupabaseClient,
  id: string
): Promise<BookingWithDetails | null> {
  const { data, error } = await supabase
    .from(TABLES.BOOKINGS)
    .select(BOOKING_WITH_DETAILS_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as BookingWithDetails | null) ?? null;
}

export async function getPropertiesWithBookings(
  supabase: SupabaseClient
): Promise<PropertyWithBookings[]> {
  const { data, error } = await supabase
    .from(TABLES.APARTMENTS)
    .select('id, apartment_number, uplisting_id, uplisting_name, bookings!inner(id)')
    .order('apartment_number', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(({ bookings: _bookings, ...apartment }) => apartment) as PropertyWithBookings[];
}
