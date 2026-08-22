-- course_categories was first created by the old taxonomy code path with a
-- minimal schema (id, name, is_active, sort_order). The current store
-- (@/lib/course-categories-store) needs slug/description/href/image columns;
-- without them every category create/update fails with "Unknown column 'slug'".
ALTER TABLE course_categories
  ADD COLUMN IF NOT EXISTS slug VARCHAR(191) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS href VARCHAR(1024) NULL,
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024) NULL,
  ADD COLUMN IF NOT EXISTS image_storage_path VARCHAR(1024) NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE course_categories SET slug = CONCAT('category-', id) WHERE slug IS NULL OR slug = '';

ALTER TABLE course_categories
  MODIFY COLUMN slug VARCHAR(191) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY IF NOT EXISTS uq_course_categories_slug (slug);
