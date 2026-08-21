-- Marketing promotions — managed from Admin Panel → Marketing → Offers / Campaigns.
-- Only active items within their date window appear on the live website.

CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  kind ENUM('offer', 'campaign') NOT NULL DEFAULT 'offer',
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  link_href VARCHAR(1024) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Banner scheduling (start/end dates) for promotional banners.
ALTER TABLE banners ADD COLUMN IF NOT EXISTS start_at DATETIME NULL;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS end_at DATETIME NULL;
