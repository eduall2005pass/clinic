-- Student Profile — student level (course classification).
-- SSC Academic / HSC Academic / Medical Admission / Varsity Admission.
-- Existing students keep their HSC batch data and default to HSC Academic.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS student_level VARCHAR(32) NOT NULL DEFAULT '' AFTER hsc_batch;

UPDATE students SET student_level = 'HSC Academic' WHERE student_level = '';
