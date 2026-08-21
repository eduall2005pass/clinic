-- Hero Section settings — single "active" row controls the homepage hero.
-- The app also self-heals this table on first use (see src/lib/hero-settings.ts).
-- Apply manually if needed:
--   ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/hero-settings-migration.sql

CREATE TABLE IF NOT EXISTS hero_settings (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  headline VARCHAR(500) NOT NULL,
  description TEXT NULL,
  button_text VARCHAR(255) NOT NULL,
  button_link VARCHAR(1024) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  background_url VARCHAR(1024) NULL,
  background_storage_path VARCHAR(1024) NULL,
  background_file_name VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
