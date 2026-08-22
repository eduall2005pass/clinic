-- Subject → course assignments (Admin Panel → Courses → Subjects).
-- A subject can be assigned to one or more catalog courses.
-- Apply after src/sql/admin-backend-migration.sql (creates course_subjects).

CREATE TABLE IF NOT EXISTS course_subject_assignments (
  subject_id VARCHAR(64) NOT NULL,
  course_slug VARCHAR(191) NOT NULL,
  PRIMARY KEY (subject_id, course_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
