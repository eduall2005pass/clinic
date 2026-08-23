-- Role-based permissions: global, admin-configurable permission matrix.
-- Defaults are built into src/lib/administration.ts; rows here override them.
CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(64) NOT NULL PRIMARY KEY,
  permissions JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
