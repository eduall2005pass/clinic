-- Student learning experience — "My Enrolled Courses" hierarchy:
-- Course → Subject → Paper / Segment → Chapter → Class / Exam / Materials
-- plus per-student favourites and class progress.
-- Apply after src/sql/admin-backend-migration.sql and
-- src/sql/course-subject-assignments-migration.sql.

-- Papers / Segments sit between a subject and its chapters.
CREATE TABLE IF NOT EXISTS course_papers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  subject_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind ENUM('paper','segment') NOT NULL DEFAULT 'paper',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A chapter MAY belong to a paper/segment; NULL keeps it directly under the
-- subject so existing admin-created chapters keep working unchanged.
ALTER TABLE course_chapters ADD COLUMN IF NOT EXISTS paper_id VARCHAR(64) NULL AFTER subject_id;

-- Downloadable/viewable materials attached to a chapter (slide, PDF, note...).
CREATE TABLE IF NOT EXISTS course_materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chapter_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  material_type ENUM('slide','pdf','note','link','other') NOT NULL DEFAULT 'pdf',
  file_url VARCHAR(1024) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY course_materials_chapter_idx (chapter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional chapter linkage for exams (NULL = course-level exam, as before).
ALTER TABLE exams ADD COLUMN IF NOT EXISTS chapter_id VARCHAR(64) NULL AFTER subject;

-- Per-student favourites (classes and materials).
CREATE TABLE IF NOT EXISTS student_favourites (
  student_uid VARCHAR(128) NOT NULL,
  item_type ENUM('class','material') NOT NULL DEFAULT 'class',
  item_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY student_favourites_unique (student_uid, item_type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-student class progress (completion + resume position).
CREATE TABLE IF NOT EXISTS student_class_progress (
  student_uid VARCHAR(128) NOT NULL,
  class_id VARCHAR(64) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  last_seen_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY student_class_progress_unique (student_uid, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
