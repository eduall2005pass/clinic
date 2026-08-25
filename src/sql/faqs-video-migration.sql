-- FAQ video support — an optional guide/demo video per FAQ item,
-- fully managed from Admin Panel → Content → FAQ.
-- Apply after src/sql/faqs-migration.sql.

ALTER TABLE faqs ADD COLUMN IF NOT EXISTS video_url VARCHAR(1024) NULL AFTER answer;
