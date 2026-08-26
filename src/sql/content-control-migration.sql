-- Course Content Control — content-type aware chapters + course-level chapters.
ALTER TABLE course_chapters ADD COLUMN IF NOT EXISTS content_type VARCHAR(24) NOT NULL DEFAULT 'class';
ALTER TABLE course_chapters ADD COLUMN IF NOT EXISTS course_slug VARCHAR(191) NULL;
CREATE INDEX IF NOT EXISTS idx_chapters_course ON course_chapters (course_slug);

-- Per-course editable content-type options (Class/Exam/Materials/Archive seeds).
CREATE TABLE IF NOT EXISTS course_content_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_slug VARCHAR(191) NOT NULL,
  subject_id VARCHAR(64) NULL,
  paper_id VARCHAR(64) NULL,
  type_key VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY ctype_unique (course_slug, subject_id, paper_id, type_key),
  KEY ctype_course_idx (course_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
