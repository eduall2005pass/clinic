-- Student reviews — managed from Admin Panel → Website → Reviews Section.
-- Only published reviews appear on the live homepage.

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  photo_url VARCHAR(1024) NULL,
  photo_storage_path VARCHAR(1024) NULL,
  course_name VARCHAR(255) NULL,
  batch_label VARCHAR(100) NULL,
  rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
  review_text TEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
