-- Course classification: every course gets one of three types.
-- SSC Academic / HSC Academic / Medical Admission.
-- Legacy rows: 'Academic' → 'HSC Academic', 'Admission' → 'Medical Admission'.

ALTER TABLE catalog_courses
  MODIFY category ENUM('Academic','Admission','SSC Academic','HSC Academic','Medical Admission')
  NOT NULL DEFAULT 'Academic';

UPDATE catalog_courses SET category = 'HSC Academic' WHERE category = 'Academic';
UPDATE catalog_courses SET category = 'Medical Admission' WHERE category = 'Admission';

ALTER TABLE catalog_courses
  MODIFY category ENUM('SSC Academic','HSC Academic','Medical Admission')
  NOT NULL DEFAULT 'HSC Academic';
