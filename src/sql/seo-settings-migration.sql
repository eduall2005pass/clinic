-- SEO Settings — managed from Admin Panel → Website → SEO Settings.
-- Applies to the live website metadata (title, description, keywords, Open Graph).
-- Empty values mean "use the built-in defaults".

CREATE TABLE IF NOT EXISTS seo_settings (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  site_title VARCHAR(255) NOT NULL DEFAULT '',
  meta_description TEXT NULL,
  keywords TEXT NULL,
  og_title VARCHAR(255) NOT NULL DEFAULT '',
  og_description TEXT NULL,
  og_image_url VARCHAR(500) NOT NULL DEFAULT '',
  updated_by VARCHAR(191) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO seo_settings (id) VALUES ('active');
