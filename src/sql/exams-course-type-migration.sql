-- Add course_type to exams so the public exam listing can filter
-- Academic vs Admission without guessing from the subject.
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS course_type ENUM('Academic','Admission') NOT NULL DEFAULT 'Academic' AFTER subject;
