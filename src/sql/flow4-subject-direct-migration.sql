-- Flow 4 Direct: Course Content → Subject → Content
-- NEW 4th flow per spec: Contents directly under Subject (no Chapter layer).
-- Keeps existing 3 flows (flow-1/flow-2/flow-3) intact; adds flow-4 alongside.
-- Student path: Course Content → Subject → Content → Open Content
-- Content supports video, PDF, notes, image, audio, quiz, etc.
--
-- Apply: ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/flow4-subject-direct-migration.sql

-- 1) Widen catalog_courses.content_layout ENUM to include flow-4
ALTER TABLE catalog_courses
  MODIFY COLUMN content_layout ENUM('flow-1','flow-2','flow-3','flow-4') NOT NULL DEFAULT 'flow-1';

-- 2) Per-course subject_contents: direct content under a Subject inside a Course
--    course_slug isolates content per course; subject_id is FK to course_subjects.
CREATE TABLE IF NOT EXISTS subject_contents (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  course_slug VARCHAR(191) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type ENUM('class','note','pdf','slide','link','exam','other','video','image','audio','quiz') NOT NULL DEFAULT 'class',
  video_url VARCHAR(1024) NULL,
  file_url VARCHAR(1024) NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_subject_contents_course (course_slug),
  KEY idx_subject_contents_subject (subject_id),
  KEY idx_subject_contents_sort (subject_id, sort_order),
  KEY idx_subject_contents_course_subject (course_slug, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Backwards: ensure chapter_contents still exists (legacy Flow 4 Chapter mode kept for existing data)
-- Already created by flow4-course-content-migration.sql — no change here.

-- 4) Helpful index for subject_contents lookups by course
CREATE INDEX IF NOT EXISTS idx_subject_contents_cs ON subject_contents (course_slug, subject_id, is_active, sort_order);
