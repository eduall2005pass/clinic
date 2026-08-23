-- Exam Results — richer result storage.
-- time_taken_seconds enables the merit tie-break (equal marks → faster
-- submission ranks higher). details stores the per-question breakdown:
-- student answer, correct answer, marks and negative-mark deductions.

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS time_taken_seconds INT NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS merit_position INT NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS details JSON NULL;
