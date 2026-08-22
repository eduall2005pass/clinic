-- Featured flag for catalog courses (Admin Panel → Courses → All Courses).
-- The column is also auto-added at runtime; this keeps the DB explicit.

ALTER TABLE catalog_courses ADD COLUMN IF NOT EXISTS is_featured TINYINT(1) NOT NULL DEFAULT 0;
