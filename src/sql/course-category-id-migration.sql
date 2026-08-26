-- Category → Course by ID (not display names). Backfills from existing ENUM.
ALTER TABLE catalog_courses ADD COLUMN IF NOT EXISTS category_id VARCHAR(64) NULL;
UPDATE catalog_courses c
  JOIN course_categories cc ON cc.name = c.category
   SET c.category_id = cc.id
 WHERE c.category_id IS NULL;
