-- Flow 4: Course → Subject → Chapter → Content
-- Final fixed hierarchy. Replaces old paper/content_type navigation.
-- Admin can manage Subjects per Course, Chapters per Subject, Contents per Chapter.
-- Student navigation remains even when Subject/Chapter has no content (No Content Available).
--
-- Apply: ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/flow4-course-content-migration.sql

-- 1) Per-course subject ordering (so admin can reorder Subjects inside a course)
ALTER TABLE course_subject_assignments ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER course_slug;
CREATE INDEX IF NOT EXISTS idx_assignments_course ON course_subject_assignments (course_slug);
CREATE INDEX IF NOT EXISTS idx_assignments_sort ON course_subject_assignments (course_slug, sort_order);

-- Backfill sort_order for existing assignments
-- SET sort order based on subject's global sort_order
UPDATE course_subject_assignments a
JOIN course_subjects s ON s.id = a.subject_id
SET a.sort_order = COALESCE(s.sort_order, 0)
WHERE a.sort_order = 0;

-- 2) Ensure course_chapters supports Flow 4 (course_slug isolation, no paper/content_type required)
ALTER TABLE course_chapters ADD COLUMN IF NOT EXISTS course_slug VARCHAR(191) NULL AFTER paper_id;
CREATE INDEX IF NOT EXISTS idx_chapters_course ON course_chapters (course_slug);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON course_chapters (subject_id);
-- Legacy paper_id and content_type columns remain but are unused in Flow 4
-- Content_type kept for backwards compat, defaults to 'class' if missing
ALTER TABLE course_chapters ADD COLUMN IF NOT EXISTS content_type VARCHAR(24) NOT NULL DEFAULT 'class' AFTER course_slug;

-- 3) Unified Content table for Flow 4 — Content inside a Chapter
-- Stores Class video, Notes, PDFs, Links, etc. as generic content items.
-- Legacy tables (course_classes, course_materials, exams) remain for old data
-- and are merged in student view, but Flow 4 admin writes here.
CREATE TABLE IF NOT EXISTS chapter_contents (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  chapter_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type ENUM('class','note','pdf','slide','link','exam','other') NOT NULL DEFAULT 'class',
  video_url VARCHAR(1024) NULL,
  file_url VARCHAR(1024) NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_chapter_contents_chapter (chapter_id),
  KEY idx_chapter_contents_sort (chapter_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Ensure course_chapters sort_order index for ordering
CREATE INDEX IF NOT EXISTS idx_chapters_sort ON course_chapters (subject_id, sort_order);
