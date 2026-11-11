-- Weekly evenly-spaced mid-stay rules
-- Adds ideal_date / is_locked, new app_settings keys, and updates booking trigger.

ALTER TABLE cleaning_tasks
  ADD COLUMN IF NOT EXISTS ideal_date DATE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN cleaning_tasks.ideal_date IS
  'Algorithm-preferred date before load-balancing flex; equals scheduled_date when first generated.';

COMMENT ON COLUMN cleaning_tasks.is_locked IS
  'True when staff edited date/cleaner/status, or when the task is completed; generate must not overwrite.';

-- Backfill: manual edits and completed work are treated as locked.
UPDATE cleaning_tasks
SET is_locked = true
WHERE is_locked = false
  AND (is_manual = true OR status = 'completed');

-- Prefer ideal_date = scheduled_date for existing rows that lack it.
UPDATE cleaning_tasks
SET ideal_date = scheduled_date
WHERE ideal_date IS NULL;

INSERT INTO app_settings (key, value)
VALUES
  ('midstay_min_nights', 5),
  ('midstay_target_gap', 7),
  ('midstay_max_gap', 8),
  ('midstay_flex_days', 1)
ON CONFLICT (key) DO NOTHING;

-- Booking trigger: same weekly placement as planMidstayNights(); keep locked/completed.
CREATE OR REPLACE FUNCTION generate_cleaning_tasks()
RETURNS TRIGGER AS $$
DECLARE
  min_nights integer;
  target_gap integer;
  max_gap integer;
  stay_nights integer;
  mid_count integer;
  k integer;
  offset_days integer;
  task_date date;
BEGIN
  DELETE FROM cleaning_tasks
  WHERE booking_id = NEW.id
    AND COALESCE(is_manual, false) = false
    AND COALESCE(is_locked, false) = false
    AND status = 'pending';

  IF NEW.booking_status = 'cancelled' OR NEW.apartment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    (SELECT value::integer FROM app_settings WHERE key = 'midstay_min_nights'),
    5
  ) INTO min_nights;
  SELECT COALESCE(
    (SELECT value::integer FROM app_settings WHERE key = 'midstay_target_gap'),
    COALESCE(
      (SELECT value::integer FROM app_settings WHERE key = 'midstay_interval_nights'),
      7
    )
  ) INTO target_gap;
  SELECT COALESCE(
    (SELECT value::integer FROM app_settings WHERE key = 'midstay_max_gap'),
    8
  ) INTO max_gap;

  IF target_gap < 1 THEN
    target_gap := 7;
  END IF;
  IF max_gap < target_gap THEN
    max_gap := target_gap;
  END IF;

  stay_nights := NEW.check_out_date - NEW.check_in_date;

  IF NOT EXISTS (
    SELECT 1 FROM cleaning_tasks
    WHERE booking_id = NEW.id AND scheduled_date = NEW.check_out_date
  ) THEN
    INSERT INTO cleaning_tasks (
      booking_id, apartment_id, task_type, scheduled_date, ideal_date,
      assigned_cleaner_id, cleaner_payout, auto_assigned, is_manual, is_locked
    )
    SELECT
      NEW.id,
      NEW.apartment_id,
      'checkout_clean',
      NEW.check_out_date,
      NEW.check_out_date,
      caa.cleaner_id,
      CASE
        WHEN caa.cleaner_id IS NOT NULL THEN COALESCE(cpr.checkout_clean_rate, 0)
        ELSE NULL
      END,
      caa.cleaner_id IS NOT NULL,
      false,
      false
    FROM (SELECT 1) AS _dummy
    LEFT JOIN cleaner_apartment_assignments caa
      ON caa.apartment_id = NEW.apartment_id AND caa.is_primary = true
    LEFT JOIN cleaner_payout_rates cpr
      ON cpr.cleaner_id = caa.cleaner_id AND cpr.apartment_id = NEW.apartment_id;
  END IF;

  IF stay_nights > min_nights THEN
    mid_count := GREATEST(
      1,
      ROUND(stay_nights::numeric / target_gap)::integer - 1,
      CEIL(stay_nights::numeric / max_gap)::integer - 1
    );

    FOR k IN 1..mid_count LOOP
      offset_days := ROUND((k * stay_nights)::numeric / (mid_count + 1))::integer;
      offset_days := LEAST(stay_nights - 2, GREATEST(1, offset_days));
      task_date := NEW.check_in_date + offset_days;

      IF NOT EXISTS (
        SELECT 1 FROM cleaning_tasks
        WHERE booking_id = NEW.id AND scheduled_date = task_date
      ) THEN
        INSERT INTO cleaning_tasks (
          booking_id, apartment_id, task_type, scheduled_date, ideal_date,
          assigned_cleaner_id, cleaner_payout, auto_assigned, is_manual, is_locked
        )
        SELECT
          NEW.id,
          NEW.apartment_id,
          'midstay_clean',
          task_date,
          task_date,
          caa.cleaner_id,
          CASE
            WHEN caa.cleaner_id IS NOT NULL THEN COALESCE(cpr.midstay_clean_rate, 0)
            ELSE NULL
          END,
          caa.cleaner_id IS NOT NULL,
          false,
          false
        FROM (SELECT 1) AS _dummy
        LEFT JOIN cleaner_apartment_assignments caa
          ON caa.apartment_id = NEW.apartment_id AND caa.is_primary = true
        LEFT JOIN cleaner_payout_rates cpr
          ON cpr.cleaner_id = caa.cleaner_id AND cpr.apartment_id = NEW.apartment_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
