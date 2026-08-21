-- Uploaded files (logos, favicons, course images, banners, profile pictures)
-- are stored in MySQL so they survive serverless deploys (Vercel) and are
-- served through /api/files/[id].

CREATE TABLE IF NOT EXISTS uploads (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  directory VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  size INT NOT NULL DEFAULT 0,
  data LONGBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
