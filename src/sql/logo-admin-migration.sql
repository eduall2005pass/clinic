-- Website logo configuration — stored in MySQL `logos` table
-- A single "active" row holds the live logo. Every component reads the
-- logo through LogoProvider/Logo — nothing is hard-coded.
-- File uploads use the local Interserver pipeline `public/uploads/...`
-- via `src/lib/storage.ts` (Firebase/Firestore is NOT used for logo).

CREATE TABLE IF NOT EXISTS logos (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  url VARCHAR(1024) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin accounts: the MySQL `admins` table is the single source of truth
-- for who may change the logo. If it does not exist yet:

CREATE TABLE IF NOT EXISTS admins (
  uid VARCHAR(191) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NULL,
  display_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example: INSERT INTO admins (uid, email, display_name) VALUES
--   ('FIREBASE_UID', 'admin@example.com', 'Admin Name');

-- Legacy note: Previously logo was in Firestore `settings/website` with
-- Firebase Storage URLs (https://firebasestorage.googleapis.com/...).
-- That path is now deprecated — local `/uploads/website/logo/...` is used.