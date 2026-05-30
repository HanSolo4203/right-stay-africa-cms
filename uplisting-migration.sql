-- Uplisting integration schema migration for Right Stay Africa CMS
-- Safe to re-run: uses IF NOT EXISTS / DO blocks / DROP POLICY IF EXISTS throughout.
-- Run in the Supabase SQL Editor or via supabase db execute.

-- =============================================================================
-- 1. apartments: Uplisting listing identifiers
-- =============================================================================

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS uplisting_id TEXT,
  ADD COLUMN IF NOT EXISTS uplisting_name TEXT;

COMMENT ON COLUMN public.apartments.uplisting_id IS 'Uplisting listing ID (unique when set)';
COMMENT ON COLUMN public.apartments.uplisting_name IS 'Listing display name from Uplisting';

-- Unique index on uplisting_id (satisfies UNIQUE + lookup index; multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_apartments_uplisting_id
  ON public.apartments (uplisting_id);

-- =============================================================================
-- 2. bookings: Uplisting sync fields
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS uplisting_booking_id TEXT,
  ADD COLUMN IF NOT EXISTS uplisting_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

COMMENT ON COLUMN public.bookings.uplisting_booking_id IS 'Uplisting booking ID (unique when set)';
COMMENT ON COLUMN public.bookings.uplisting_listing_id IS 'Uplisting listing ID (references apartments.uplisting_id)';
COMMENT ON COLUMN public.bookings.source IS 'Origin: manual, uplisting_api, or uplisting_webhook';
COMMENT ON COLUMN public.bookings.raw_payload IS 'Full Uplisting API/webhook payload for debugging';

-- Backfill source for rows created before default was applied
UPDATE public.bookings
SET source = 'manual'
WHERE source IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_uplisting_booking_id
  ON public.bookings (uplisting_booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_uplisting_listing_id
  ON public.bookings (uplisting_listing_id);

-- =============================================================================
-- 3. RLS: service_role full access (table-level; covers new columns)
-- =============================================================================

ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access to apartments" ON public.apartments;
CREATE POLICY "Allow service role full access to apartments"
  ON public.apartments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role full access to bookings" ON public.bookings;
CREATE POLICY "Allow service role full access to bookings"
  ON public.bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
