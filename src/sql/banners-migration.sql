-- Banner slides (homepage slider) stored in MySQL.
-- Each row is one slide; order follows sort_order then creation time.

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  url VARCHAR(1024) NOT NULL,
  href VARCHAR(1024) NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
