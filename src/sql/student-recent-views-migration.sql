-- Recently Viewed — per-student view history for the Dashboard card.
-- One row per (student, item); re-viewing bumps viewed_at so the most
-- recently opened item always sorts first.
-- item_type:
--   course   → catalog_courses.slug
--   class    → course_classes.id
--   exam     → exams.id
--   material → course_materials.id

CREATE TABLE IF NOT EXISTS student_recent_views (
  student_uid VARCHAR(128) NOT NULL,
  item_type ENUM('course','class','exam','material') NOT NULL DEFAULT 'course',
  item_id VARCHAR(191) NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_uid, item_type, item_id),
  KEY student_recent_views_recent_idx (student_uid, viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
