-- Popup / Announcements — managed from Admin Panel → Website → Popup / Announcement.
-- Only active announcements within their date window appear on the live website.

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  button_text VARCHAR(100) NULL,
  button_href VARCHAR(1024) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
