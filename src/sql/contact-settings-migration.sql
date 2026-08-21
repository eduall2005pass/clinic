-- Contact information fields on website_settings.
-- The app also tolerates missing columns until this migration is applied
-- (see src/lib/website-settings.ts).
-- Apply manually if needed:
--   ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/contact-settings-migration.sql

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS address VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS other_contact_links TEXT NULL;
