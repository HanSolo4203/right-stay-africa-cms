-- Capacity-based load balancing for cleaning tasks
-- Safe to re-run. Ensures midstay flex columns exist, then adds capacity fields.

-- =============================================================================
-- 0. Ensure midstay flex columns exist (from midstay-weekly-rules.sql)
-- =============================================================================

ALTER TABLE cleaning_tasks
  ADD COLUMN IF NOT EXISTS ideal_date DATE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

UPDATE cleaning_tasks
SET is_locked = true
WHERE is_locked = false
  AND (COALESCE(is_manual, false) = true OR status = 'completed');

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

-- =============================================================================
-- 1. apartments: size type + optional minute overrides
-- =============================================================================

ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS size_type TEXT NOT NULL DEFAULT '1_bed',
  ADD COLUMN IF NOT EXISTS checkout_minutes INT,
  ADD COLUMN IF NOT EXISTS midstay_minutes INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'apartments_size_type_check'
  ) THEN
    ALTER TABLE apartments
      ADD CONSTRAINT apartments_size_type_check
      CHECK (size_type IN ('1_bed', '2_bed_luxury', 'custom'));
  END IF;
END $$;

COMMENT ON COLUMN apartments.size_type IS
  'Property size used for default cleaning durations: 1_bed, 2_bed_luxury, or custom.';
COMMENT ON COLUMN apartments.checkout_minutes IS
  'Optional checkout duration override in minutes; NULL uses size_type default.';
COMMENT ON COLUMN apartments.midstay_minutes IS
  'Optional mid-stay duration override in minutes; NULL uses size_type default.';

-- =============================================================================
-- 2. cleaners: daily capacity + on-call / active flags
-- =============================================================================

ALTER TABLE cleaners
  ADD COLUMN IF NOT EXISTS daily_capacity_minutes INT NOT NULL DEFAULT 450,
  ADD COLUMN IF NOT EXISTS is_on_call BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN cleaners.daily_capacity_minutes IS
  'Minutes of cleaning work this cleaner can take per day (default 450 = 7.5h).';
COMMENT ON COLUMN cleaners.is_on_call IS
  'True for the extra on-call cleaner; never auto-assigned unless auto_use_on_call is enabled.';
COMMENT ON COLUMN cleaners.is_active IS
  'Inactive cleaners are excluded from capacity and auto-assignment.';

-- =============================================================================
-- 3. cleaning_tasks: duration in minutes
-- =============================================================================

ALTER TABLE cleaning_tasks
  ADD COLUMN IF NOT EXISTS duration_minutes INT;

COMMENT ON COLUMN cleaning_tasks.duration_minutes IS
  'Scheduled work duration in minutes used for capacity load balancing.';

-- =============================================================================
-- 4. app_settings defaults (numeric durations + JSON text for blocked weekdays)
-- =============================================================================

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS text_value TEXT;

INSERT INTO app_settings (key, value)
VALUES
  ('cleaning_minutes_1_bed_checkout', 150),
  ('cleaning_minutes_1_bed_midstay', 90),
  ('cleaning_minutes_2_bed_luxury_checkout', 180),
  ('cleaning_minutes_2_bed_luxury_midstay', 120),
  ('auto_use_on_call', 0)
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, text_value)
VALUES ('midstay_blocked_weekdays', NULL, '[]')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 5. Booking trigger: set duration_minutes from apartment size / overrides
-- =============================================================================

CREATE OR REPLACE FUNCTION resolve_cleaning_duration_minutes(
  p_apartment_id UUID,
  p_task_type TEXT
) RETURNS INT AS $$
DECLARE
  apt RECORD;
  size_key TEXT;
  setting_key TEXT;
  minutes INT;
  default_minutes INT;
BEGIN
  SELECT size_type, checkout_minutes, midstay_minutes
  INTO apt
  FROM apartments
  WHERE id = p_apartment_id;

  IF NOT FOUND THEN
    RETURN CASE WHEN p_task_type = 'checkout_clean' THEN 150 ELSE 90 END;
  END IF;

  IF p_task_type = 'checkout_clean' AND apt.checkout_minutes IS NOT NULL THEN
    RETURN apt.checkout_minutes;
  END IF;
  IF p_task_type = 'midstay_clean' AND apt.midstay_minutes IS NOT NULL THEN
    RETURN apt.midstay_minutes;
  END IF;

  size_key := CASE apt.size_type
    WHEN '2_bed_luxury' THEN '2_bed_luxury'
    ELSE '1_bed'
  END;

  setting_key := CASE
    WHEN p_task_type = 'checkout_clean' THEN
      'cleaning_minutes_' || size_key || '_checkout'
    ELSE
      'cleaning_minutes_' || size_key || '_midstay'
  END;

  SELECT value::integer INTO minutes
  FROM app_settings
  WHERE key = setting_key;

  IF minutes IS NOT NULL AND minutes > 0 THEN
    RETURN minutes;
  END IF;

  default_minutes := CASE
    WHEN size_key = '2_bed_luxury' AND p_task_type = 'checkout_clean' THEN 180
    WHEN size_key = '2_bed_luxury' THEN 120
    WHEN p_task_type = 'checkout_clean' THEN 150
    ELSE 90
  END;

  RETURN default_minutes;
END;
$$ LANGUAGE plpgsql;

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
  duration_mins integer;
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
    duration_mins := resolve_cleaning_duration_minutes(NEW.apartment_id, 'checkout_clean');
    INSERT INTO cleaning_tasks (
      booking_id, apartment_id, task_type, scheduled_date, ideal_date,
      assigned_cleaner_id, cleaner_payout, auto_assigned, is_manual, is_locked,
      duration_minutes
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
      false,
      duration_mins
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
        duration_mins := resolve_cleaning_duration_minutes(NEW.apartment_id, 'midstay_clean');
        INSERT INTO cleaning_tasks (
          booking_id, apartment_id, task_type, scheduled_date, ideal_date,
          assigned_cleaner_id, cleaner_payout, auto_assigned, is_manual, is_locked,
          duration_minutes
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
          false,
          duration_mins
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

-- Backfill duration for existing tasks from apartment defaults.
UPDATE cleaning_tasks ct
SET duration_minutes = resolve_cleaning_duration_minutes(ct.apartment_id, ct.task_type)
WHERE duration_minutes IS NULL;
