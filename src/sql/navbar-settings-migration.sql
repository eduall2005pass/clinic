-- Header & Navbar settings — managed from Admin Panel → Website → Header & Navbar
-- Single-row table for global toggles + one row per navigation item.

CREATE TABLE IF NOT EXISTS navbar_settings (
  id INT PRIMARY KEY,
  show_navbar TINYINT(1) NOT NULL DEFAULT 1,
  show_more_menu TINYINT(1) NOT NULL DEFAULT 1,
  show_theme_toggle TINYINT(1) NOT NULL DEFAULT 1,
  show_login_button TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS navbar_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  href VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO navbar_settings (id) VALUES (1);

INSERT IGNORE INTO navbar_items (item_key, label, href, sort_order, is_active) VALUES
  ('home', 'Home', '/', 1, 1),
  ('dashboard', 'Dashboard', '/dashboard', 2, 1),
  ('courses', 'Course', '/courses', 3, 1),
  ('public-exam', 'Public Exam', '/exam', 4, 1),
  ('our-success', 'Our Success', '/#our-success', 5, 1),
  ('jersey', 'Jersey', NULL, 6, 1),
  ('mentors', 'Mentor', '/#mentors', 7, 1),
  ('reviews', 'Review', '/#reviews', 8, 1),
  ('faq', 'FAQ', '/#faq', 9, 1);
