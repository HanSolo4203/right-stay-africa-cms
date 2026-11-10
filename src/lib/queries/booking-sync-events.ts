import type { createClientComponentClient } from '@/lib/supabase';

type SupabaseClient = ReturnType<typeof createClientComponentClient>;

export type BookingSyncEventType =
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'sync_completed';

export type BookingSyncEventSource =
  | 'uplisting_api'
  | 'uplisting_webhook'
  | 'system';

export type BookingSyncEvent = {
  id: string;
  event_type: BookingSyncEventType;
  source: BookingSyncEventSource;
  booking_id: string | null;
  uplisting_booking_id: string | null;
  uplisting_listing_id: string | null;
  apartment_id: string | null;
  booking_reference: string | null;
  guest_name: string | null;
  property_name: string | null;
  booking_status: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type BookingSyncEventFilters = {
  source?: BookingSyncEventSource | 'all';
  eventType?: BookingSyncEventType | 'all';
  limit?: number;
};

export async function getBookingSyncEvents(
  supabase: SupabaseClient,
  filters: BookingSyncEventFilters = {}
): Promise<BookingSyncEvent[]> {
  const limit = filters.limit ?? 100;

  let query = supabase
    .from('booking_sync_events')
    .select(
      `
      id,
      event_type,
      source,
      booking_id,
      uplisting_booking_id,
      uplisting_listing_id,
      apartment_id,
      booking_reference,
      guest_name,
      property_name,
      booking_status,
      check_in_date,
      check_out_date,
      summary,
      details,
      created_at
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  if (filters.eventType && filters.eventType !== 'all') {
    query = query.eq('event_type', filters.eventType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BookingSyncEvent[];
}
