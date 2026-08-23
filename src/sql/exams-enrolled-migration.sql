-- Enrolled Exams: exams gated by course enrollment.
-- 1) Allow kind='enrolled' on the exams table.
ALTER TABLE exams
  MODIFY COLUMN kind ENUM('public','practice','enrolled') NOT NULL DEFAULT 'public';

-- 2) Many-to-many assignment: exam → courses (students enrolled in any of
--    these courses may take the exam).
CREATE TABLE IF NOT EXISTS exam_courses (
  exam_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(191) NOT NULL,
  PRIMARY KEY (exam_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
