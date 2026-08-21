-- FAQs — managed from Admin Panel → Website → FAQ Section.
-- Only published FAQs appear on the live homepage, in sort_order.

CREATE TABLE IF NOT EXISTS faqs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  status ENUM('published', 'unpublished') NOT NULL DEFAULT 'published',
  sort_order INT NOT NULL DEFAULT 0,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
