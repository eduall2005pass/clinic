-- catalog_courses.category used the legacy enum ('Academic','Admission'),
-- which made every admin course save fail with
-- "Data truncated for column 'category'" (HTTP 400).
-- Migrate legacy rows to the current 3-value enum.
ALTER TABLE catalog_courses
  MODIFY COLUMN category ENUM('SSC Academic','HSC Academic','Medical Admission','Academic','Admission') NOT NULL DEFAULT 'HSC Academic';
UPDATE catalog_courses SET category='Medical Admission' WHERE category='Admission';
UPDATE catalog_courses SET category='HSC Academic' WHERE category IN ('Academic','');
ALTER TABLE catalog_courses
  MODIFY COLUMN category ENUM('SSC Academic','HSC Academic','Medical Admission') NOT NULL DEFAULT 'HSC Academic';
