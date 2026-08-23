-- Admin Management: role + activation support for the `admins` table.
-- Apply with:
--   ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/admins-management-migration.sql

ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(64) NOT NULL DEFAULT 'admin';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

-- Existing admins keep full access (active, default role).
UPDATE admins SET is_active = 1 WHERE is_active IS NULL;
