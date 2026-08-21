-- Theme & Appearance — managed from Admin Panel → Website → Theme & Appearance.
-- Applies to the live website only (never the Admin Panel).
-- Empty primary_color / secondary_color means "use the built-in palette".

CREATE TABLE IF NOT EXISTS theme_settings (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  primary_color VARCHAR(9) NOT NULL DEFAULT '',
  secondary_color VARCHAR(9) NOT NULL DEFAULT '',
  button_style VARCHAR(20) NOT NULL DEFAULT 'default',
  border_radius VARCHAR(20) NOT NULL DEFAULT 'default',
  theme_mode VARCHAR(10) NOT NULL DEFAULT 'dark',
  updated_by VARCHAR(191) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO theme_settings (id) VALUES ('active');
