-- Configurable mid-stay rules and preserve manual calendar edits
-- Applied via Supabase migration cleaning_schedule_and_manual_tasks.

ALTER TABLE cleaning_tasks
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN cleaning_tasks.is_manual IS
  'True when staff created or rescheduled the task on the calendar; generate must not overwrite.';

INSERT INTO app_settings (key, value)
VALUES
  ('midstay_min_nights', 5),
  ('midstay_interval_nights', 5)
ON CONFLICT (key) DO NOTHING;
