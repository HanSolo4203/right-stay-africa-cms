-- Cleaner assignment system migration for Right Stay Africa CMS
-- Safe to re-run. Run in Supabase SQL Editor after create-cleaning-tasks.sql.

-- =============================================================================
-- 1. Extend cleaning_tasks
-- =============================================================================

ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS cleaner_payout DECIMAL(10,2);
ALTER TABLE cleaning_tasks ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;

-- =============================================================================
-- 2. cleaner_apartment_assignments
-- =============================================================================

CREATE TABLE IF NOT EXISTS cleaner_apartment_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES cleaners(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(apartment_id, cleaner_id)
);

CREATE INDEX IF NOT EXISTS idx_cleaner_apartment_assignments_apartment
  ON cleaner_apartment_assignments(apartment_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_apartment_assignments_cleaner
  ON cleaner_apartment_assignments(cleaner_id);

-- =============================================================================
-- 3. cleaner_payout_rates
-- =============================================================================

CREATE TABLE IF NOT EXISTS cleaner_payout_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID REFERENCES cleaners(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  checkout_clean_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  midstay_clean_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'ZAR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cleaner_id, apartment_id)
);

CREATE INDEX IF NOT EXISTS idx_cleaner_payout_rates_cleaner
  ON cleaner_payout_rates(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_payout_rates_apartment
  ON cleaner_payout_rates(apartment_id);

DROP TRIGGER IF EXISTS update_cleaner_payout_rates_updated_at ON cleaner_payout_rates;
CREATE TRIGGER update_cleaner_payout_rates_updated_at
  BEFORE UPDATE ON cleaner_payout_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. RLS — cleaner_apartment_assignments
-- =============================================================================

ALTER TABLE cleaner_apartment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view cleaner_apartment_assignments"
  ON cleaner_apartment_assignments;
CREATE POLICY "Allow authenticated users to view cleaner_apartment_assignments"
  ON cleaner_apartment_assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert cleaner_apartment_assignments"
  ON cleaner_apartment_assignments;
CREATE POLICY "Allow authenticated users to insert cleaner_apartment_assignments"
  ON cleaner_apartment_assignments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update cleaner_apartment_assignments"
  ON cleaner_apartment_assignments;
CREATE POLICY "Allow authenticated users to update cleaner_apartment_assignments"
  ON cleaner_apartment_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete cleaner_apartment_assignments"
  ON cleaner_apartment_assignments;
CREATE POLICY "Allow authenticated users to delete cleaner_apartment_assignments"
  ON cleaner_apartment_assignments FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service role full access to cleaner_apartment_assignments"
  ON cleaner_apartment_assignments;
CREATE POLICY "Allow service role full access to cleaner_apartment_assignments"
  ON cleaner_apartment_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 5. RLS — cleaner_payout_rates
-- =============================================================================

ALTER TABLE cleaner_payout_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view cleaner_payout_rates"
  ON cleaner_payout_rates;
CREATE POLICY "Allow authenticated users to view cleaner_payout_rates"
  ON cleaner_payout_rates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert cleaner_payout_rates"
  ON cleaner_payout_rates;
CREATE POLICY "Allow authenticated users to insert cleaner_payout_rates"
  ON cleaner_payout_rates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update cleaner_payout_rates"
  ON cleaner_payout_rates;
CREATE POLICY "Allow authenticated users to update cleaner_payout_rates"
  ON cleaner_payout_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete cleaner_payout_rates"
  ON cleaner_payout_rates;
CREATE POLICY "Allow authenticated users to delete cleaner_payout_rates"
  ON cleaner_payout_rates FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service role full access to cleaner_payout_rates"
  ON cleaner_payout_rates;
CREATE POLICY "Allow service role full access to cleaner_payout_rates"
  ON cleaner_payout_rates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 6. Auto-generate cleaning tasks with cleaner auto-assignment
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_cleaning_tasks()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM cleaning_tasks WHERE booking_id = NEW.id;

  IF NEW.booking_status != 'cancelled' THEN

    -- Checkout clean on check_out_date
    INSERT INTO cleaning_tasks (
      booking_id, apartment_id, task_type, scheduled_date,
      assigned_cleaner_id, cleaner_payout, auto_assigned
    )
    SELECT
      NEW.id,
      NEW.apartment_id,
      'checkout_clean',
      NEW.check_out_date,
      caa.cleaner_id,
      CASE
        WHEN caa.cleaner_id IS NOT NULL THEN COALESCE(cpr.checkout_clean_rate, 0)
        ELSE NULL
      END,
      caa.cleaner_id IS NOT NULL
    FROM (SELECT 1) AS _dummy
    LEFT JOIN cleaner_apartment_assignments caa
      ON caa.apartment_id = NEW.apartment_id AND caa.is_primary = true
    LEFT JOIN cleaner_payout_rates cpr
      ON cpr.cleaner_id = caa.cleaner_id AND cpr.apartment_id = NEW.apartment_id;

    -- Mid-stay clean on day 5 for stays longer than 5 nights
    IF (NEW.check_out_date - NEW.check_in_date) > 5 THEN
      INSERT INTO cleaning_tasks (
        booking_id, apartment_id, task_type, scheduled_date,
        assigned_cleaner_id, cleaner_payout, auto_assigned
      )
      SELECT
        NEW.id,
        NEW.apartment_id,
        'midstay_clean',
        NEW.check_in_date + INTERVAL '5 days',
        caa.cleaner_id,
        CASE
          WHEN caa.cleaner_id IS NOT NULL THEN COALESCE(cpr.midstay_clean_rate, 0)
          ELSE NULL
        END,
        caa.cleaner_id IS NOT NULL
      FROM (SELECT 1) AS _dummy
      LEFT JOIN cleaner_apartment_assignments caa
        ON caa.apartment_id = NEW.apartment_id AND caa.is_primary = true
      LEFT JOIN cleaner_payout_rates cpr
        ON cpr.cleaner_id = caa.cleaner_id AND cpr.apartment_id = NEW.apartment_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_cleaning_tasks ON bookings;
CREATE TRIGGER auto_generate_cleaning_tasks
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_cleaning_tasks();
