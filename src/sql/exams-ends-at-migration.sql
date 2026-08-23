-- Public exams: start/end time window.
-- scheduled_at is the start time; ends_at closes the exam window.
-- The column is also auto-added at runtime.

ALTER TABLE exams ADD COLUMN IF NOT EXISTS ends_at DATETIME NULL AFTER scheduled_at;
