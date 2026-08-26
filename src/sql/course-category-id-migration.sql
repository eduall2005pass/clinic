-- Category → Course by ID (not display names). Backfills from existing ENUM.
-- Course Control categories are named e.g. "SSC Academic Courses" while the
-- catalog ENUM holds "SSC Academic" — match on normalized name prefix so the
-- join actually links rows (exact-name match linked 0 rows before).
ALTER TABLE catalog_courses ADD COLUMN IF NOT EXISTS category_id VARCHAR(191) NULL;
UPDATE catalog_courses c
  JOIN course_categories cc
    ON REPLACE(LOWER(cc.name), ' ', '') LIKE CONCAT(REPLACE(LOWER(c.category), ' ', ''), '%')
    OR REPLACE(LOWER(cc.slug), '-', '') = CONCAT(REPLACE(LOWER(c.category), ' ', ''), '')
   SET c.category_id = cc.id
 WHERE c.category_id IS NULL OR c.category_id NOT IN (SELECT id FROM course_categories);
