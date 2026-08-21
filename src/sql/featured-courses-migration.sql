-- Featured Courses — managed from Admin Panel → Marketing → Featured Courses.
-- Active slugs appear on the homepage featured courses section, in sort_order.

CREATE TABLE IF NOT EXISTS featured_courses (
  course_slug VARCHAR(50) NOT NULL PRIMARY KEY,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
