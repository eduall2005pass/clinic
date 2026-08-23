-- Admin-managed courses (Admin Panel → Courses → All Courses).
-- The app also self-heals this table on first use (see src/lib/admin-courses.ts).
-- Apply manually if needed:
--   ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/admin-courses-migration.sql

CREATE TABLE IF NOT EXISTS admin_courses (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  short_description TEXT NULL,
  description MEDIUMTEXT NULL,
  category VARCHAR(191) NOT NULL DEFAULT '',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_price DECIMAL(10, 2) NULL,
  duration VARCHAR(191) NULL,
  image_url VARCHAR(1024) NULL,
  image_storage_path VARCHAR(1024) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  updated_by VARCHAR(191) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_courses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
