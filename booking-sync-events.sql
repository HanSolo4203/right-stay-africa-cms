-- Booking sync activity feed for Uplisting manual syncs + webhooks
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS throughout.

CREATE TABLE IF NOT EXISTS public.booking_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  uplisting_booking_id TEXT,
  uplisting_listing_id TEXT,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  booking_reference TEXT,
  guest_name TEXT,
  property_name TEXT,
  booking_status TEXT,
  check_in_date DATE,
  check_out_date DATE,
  summary TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_sync_events_event_type_check CHECK (
    event_type = ANY (ARRAY[
      'booking_created'::text,
      'booking_updated'::text,
      'booking_cancelled'::text,
      'sync_completed'::text
    ])
  ),
  CONSTRAINT booking_sync_events_source_check CHECK (
    source = ANY (ARRAY[
      'uplisting_api'::text,
      'uplisting_webhook'::text,
      'system'::text
    ])
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_sync_events_created_at
  ON public.booking_sync_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_sync_events_source
  ON public.booking_sync_events (source);

CREATE INDEX IF NOT EXISTS idx_booking_sync_events_event_type
  ON public.booking_sync_events (event_type);

CREATE INDEX IF NOT EXISTS idx_booking_sync_events_uplisting_booking_id
  ON public.booking_sync_events (uplisting_booking_id);

COMMENT ON TABLE public.booking_sync_events IS
  'Activity feed for Uplisting booking syncs and webhooks';

ALTER TABLE public.booking_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view booking_sync_events"
  ON public.booking_sync_events;
CREATE POLICY "Allow authenticated users to view booking_sync_events"
  ON public.booking_sync_events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role full access to booking_sync_events"
  ON public.booking_sync_events;
CREATE POLICY "Allow service role full access to booking_sync_events"
  ON public.booking_sync_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.booking_sync_events TO authenticated;
GRANT ALL ON public.booking_sync_events TO service_role;
