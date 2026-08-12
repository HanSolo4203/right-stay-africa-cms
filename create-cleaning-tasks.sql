-- Cleaning tasks schema for Right Stay Africa CMS
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS throughout.
-- Run in the Supabase SQL Editor or via supabase db execute.

-- =============================================================================
-- 1. cleaning_tasks table
-- =============================================================================

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('checkout_clean', 'midstay_clean')),
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  notes TEXT,
  assigned_cleaner_id UUID REFERENCES cleaners(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_booking_id ON cleaning_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_apartment_id ON cleaning_tasks(apartment_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_scheduled_date ON cleaning_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON cleaning_tasks(status);

COMMENT ON TABLE cleaning_tasks IS
'Auto-generated and manually managed cleaning tasks linked to bookings.';

-- =============================================================================
-- 2. updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cleaning_tasks_updated_at ON cleaning_tasks;
CREATE TRIGGER update_cleaning_tasks_updated_at
  BEFORE UPDATE ON cleaning_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. RLS policies for authenticated and service_role
-- =============================================================================

ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "Allow authenticated users to view cleaning_tasks"
  ON cleaning_tasks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "Allow authenticated users to insert cleaning_tasks"
  ON cleaning_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "Allow authenticated users to update cleaning_tasks"
  ON cleaning_tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "Allow authenticated users to delete cleaning_tasks"
  ON cleaning_tasks FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role full access to cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "Allow service role full access to cleaning_tasks"
  ON cleaning_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 4. Auto-generate cleaning tasks from bookings
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_cleaning_tasks()
RETURNS TRIGGER AS $$
DECLARE
  min_nights integer;
  interval_nights integer;
  stay_nights integer;
  offset_days integer;
  task_date date;
BEGIN
  DELETE FROM cleaning_tasks
  WHERE booking_id = NEW.id
    AND COALESCE(is_manual, false) = false
    AND status NOT IN ('completed', 'skipped');

  IF NEW.booking_status = 'cancelled' OR NEW.apartment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    (SELECT value::integer FROM app_settings WHERE key = 'midstay_min_nights'),
    5
  ) INTO min_nights;
  SELECT COALESCE(
    (SELECT value::integer FROM app_settings WHERE key = 'midstay_interval_nights'),
    5
  ) INTO interval_nights;

  IF interval_nights < 1 THEN
    interval_nights := 5;
  END IF;

  stay_nights := NEW.check_out_date - NEW.check_in_date;

  IF NOT EXISTS (
    SELECT 1 FROM cleaning_tasks
    WHERE booking_id = NEW.id AND scheduled_date = NEW.check_out_date
  ) THEN
    INSERT INTO cleaning_tasks (booking_id, apartment_id, task_type, scheduled_date, is_manual)
    VALUES (NEW.id, NEW.apartment_id, 'checkout_clean', NEW.check_out_date, false);
  END IF;

  IF stay_nights > min_nights THEN
    offset_days := interval_nights;
    WHILE offset_days < stay_nights LOOP
      task_date := NEW.check_in_date + offset_days;
      IF NOT EXISTS (
        SELECT 1 FROM cleaning_tasks
        WHERE booking_id = NEW.id AND scheduled_date = task_date
      ) THEN
        INSERT INTO cleaning_tasks (booking_id, apartment_id, task_type, scheduled_date, is_manual)
        VALUES (NEW.id, NEW.apartment_id, 'midstay_clean', task_date, false);
      END IF;
      offset_days := offset_days + interval_nights;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_cleaning_tasks ON bookings;
CREATE TRIGGER auto_generate_cleaning_tasks
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_cleaning_tasks();
