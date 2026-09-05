-- Favourite Dashboard: extend student_favourites to 4 categories (class, exam, material, qa)
-- Run after student-learning-migration.sql

-- Ensure table exists with broader type (VARCHAR) so future types never need ENUM alters.
-- If table already exists with ENUM('class','material'), convert to VARCHAR.
ALTER TABLE student_favourites MODIFY COLUMN item_type VARCHAR(20) NOT NULL;
ALTER TABLE student_favourites MODIFY COLUMN item_id VARCHAR(191) NOT NULL;

-- In case table was not yet created (fresh DB), ensure full definition.
CREATE TABLE IF NOT EXISTS student_favourites (
  student_uid VARCHAR(128) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  item_id VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY student_favourites_unique (student_uid, item_type, item_id),
  KEY idx_fav_user_type (student_uid, item_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
