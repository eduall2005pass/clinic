-- Footer management fields on website_settings.
-- The app also tolerates missing columns until this migration is applied
-- (see src/lib/website-settings.ts).
-- Apply manually if needed:
--   ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/footer-settings-migration.sql

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS copyright_text VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS footer_links TEXT NULL,
  ADD COLUMN IF NOT EXISTS show_explore TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_programs TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_contact TINYINT(1) NOT NULL DEFAULT 1;
