-- Social links — managed from Admin Panel → Website → Social Links.
-- Only active platforms appear on the live website footer.

CREATE TABLE IF NOT EXISTS social_links (
  platform_key VARCHAR(50) NOT NULL PRIMARY KEY,
  url VARCHAR(1024) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO social_links (platform_key, sort_order, is_active) VALUES
  ('facebook', 1, 1),
  ('youtube', 2, 1);
