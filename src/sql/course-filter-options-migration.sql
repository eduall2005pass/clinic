-- Editable course-page batch filter options (Admin → Course Control → Filter Edit)
CREATE TABLE IF NOT EXISTS course_filter_options (
  scope VARCHAR(16) NOT NULL,
  options JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  UNIQUE KEY uq_course_filter_options_pk (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
