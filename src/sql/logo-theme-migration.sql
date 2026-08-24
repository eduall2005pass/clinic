-- Theme-based dual logo system.
-- No schema change is required: the existing `logos` table stores one row
-- per logo slot, keyed by its `id` primary key:
--   id = 'active'       → shared/fallback logo (legacy single-logo slot)
--   id = 'active-light' → LIGHT MODE logo (shown when the visitor uses light mode)
--   id = 'active-dark'  → DARK MODE logo (shown when the visitor uses dark mode)
-- The main website picks the row by the visitor's CURRENT theme and falls
-- back to 'active', then to the built-in default. Upload order / admin
-- preference never decides which logo displays.

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
