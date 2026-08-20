-- Admin-only website logo management — database migration.
-- Run this once on the production MySQL database (Interserver).

-- 1. Admin accounts. Only UIDs present in this table may change the
--    website logo (or manage banners) through the admin panel.
CREATE TABLE IF NOT EXISTS admins (
  uid VARCHAR(191) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NULL,
  display_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Track which admin last updated the active logo.
ALTER TABLE logos
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(191) NULL AFTER updated_at;

-- 3. Grant admin rights to the Firebase user(s) who manage the website.
--    Replace the UID (and optionally name/email) below with the Google
--    account used to sign in to the admin panel.
-- INSERT INTO admins (uid, email, display_name) VALUES
--   ('FIREBASE_UID', 'admin@example.com', 'Admin Name');