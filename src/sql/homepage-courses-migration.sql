-- Homepage Courses Section — 3 category cards managed from Admin Panel
-- Each row represents one of the 3 fixed categories:
--   ssc, hsc, medical
-- Admin can edit title, image, description, button and active state.
-- Homepage reads from MySQL and updates automatically.

CREATE TABLE IF NOT EXISTS homepage_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(1024) NULL,
  image_storage_path VARCHAR(1024) NULL,
  image_file_name VARCHAR(255) NULL,
  button_text VARCHAR(100) NOT NULL DEFAULT 'Explore Courses',
  button_href VARCHAR(1024) NOT NULL DEFAULT '/courses',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default 3 cards if not exist
INSERT INTO homepage_courses (slug, title, description, image_url, button_text, button_href, is_active, sort_order)
VALUES
  ('ssc', 'SSC Academic Courses', 'Complete preparation for SSC students with structured lessons and exams.', NULL, 'Explore Courses', '/courses?category=ssc', 1, 1),
  ('hsc', 'HSC Academic Courses', 'HSC focused courses covering all subjects with expert guidance.', NULL, 'Explore Courses', '/courses?category=hsc', 1, 2),
  ('medical', 'Medical Admission Courses', 'Dedicated medical admission preparation with model tests and mentorship.', NULL, 'Explore Courses', '/courses?category=medical', 1, 3)
ON DUPLICATE KEY UPDATE slug = VALUES(slug);
