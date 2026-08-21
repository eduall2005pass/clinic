-- Website Settings — single live document stored as the `active` row in `website_settings`.
-- Every field is editable from /admin/settings and saved to MySQL (`/api/website-settings`).
-- File uploads (logo, favicon) use the local Interserver pipeline `public/uploads/...`
-- via `src/lib/storage.ts`; legacy Firebase URLs are not written.

CREATE TABLE IF NOT EXISTS website_settings (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  site_name VARCHAR(255) NOT NULL DEFAULT 'MediSpark',
  tagline TEXT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  facebook_url VARCHAR(1024) NULL,
  youtube_url VARCHAR(1024) NULL,
  favicon_url VARCHAR(1024) NULL,
  favicon_storage_path VARCHAR(1024) NULL,
  favicon_file_name VARCHAR(255) NULL,
  favicon_updated_at TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the live row if it does not already exist (id = 'active').
INSERT IGNORE INTO website_settings (id, site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url)
VALUES (
  'active',
  'MediSpark',
  'HSC academic & medical admission preparation platform built for future medical students.',
  'support@medispark.com',
  '',
  '',
  ''
);
