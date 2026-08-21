-- Homepage sections — visibility, order and header text managed from
-- Admin Panel → Website → Homepage. Content of each section is NOT managed here.

CREATE TABLE IF NOT EXISTS homepage_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO homepage_sections (section_key, sort_order, is_active) VALUES
  ('banner', 1, 1),
  ('hero', 2, 1),
  ('homepage-courses', 3, 1),
  ('featured-courses', 4, 1),
  ('why-medispark', 5, 1),
  ('our-success', 6, 1),
  ('jersey', 7, 1),
  ('mentors', 8, 1),
  ('reviews', 9, 1),
  ('faq', 10, 1);
