-- Banner slides (homepage slider) stored in MySQL.
-- Each row is one slide; order follows sort_order then creation time.
-- title/is_active added for full Hero/Banner management.

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  url VARCHAR(1024) NOT NULL,
  href VARCHAR(1024) NULL,
  title VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Older databases may pre-date these columns (MariaDB supports IF NOT EXISTS).
ALTER TABLE banners ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

-- Seed the original default slides so the slider keeps working.
INSERT IGNORE INTO banners (id, url, href, title, is_active, file_name, storage_path, sort_order) VALUES
  ('featured-course-1', '/banners/featured-course-1.svg', '#featured-courses', 'Featured Course', 1, 'featured-course-1.svg', '/banners/featured-course-1.svg', 1),
  ('featured-course-2', '/banners/featured-course-2.svg', '#featured-courses', 'Featured Course', 1, 'featured-course-2.svg', '/banners/featured-course-2.svg', 2),
  ('public-exam', '/banners/public-exam.svg', '/exam', 'MediSpark Public Exam', 1, 'public-exam.svg', '/banners/public-exam.svg', 3),
  ('jersey-of-medispark', '/banners/jersey-of-medispark.svg', '#jerseys', 'Jersey of MediSpark', 1, 'jersey-of-medispark.svg', '/banners/jersey-of-medispark.svg', 4);
