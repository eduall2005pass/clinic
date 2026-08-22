-- Course categories (Admin Panel → Courses → Categories).
-- Each row is one course category shown on /courses and usable by the
-- course system. Order follows sort_order then creation time.

CREATE TABLE IF NOT EXISTS course_categories (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  slug VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  href VARCHAR(1024) NULL,
  image_url VARCHAR(1024) NULL,
  image_storage_path VARCHAR(1024) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the two built-in categories so existing links keep working.
INSERT IGNORE INTO course_categories (id, slug, name, description, href, is_active, sort_order) VALUES
  ('category-academic', 'academic', 'Academic Courses', 'Complete HSC academic preparation — every subject with batch-wise courses and board exam-focused explanations.', '/courses/academic', 1, 1),
  ('category-admission', 'admission', 'Admission Courses', 'Focused medical admission preparation — combined syllabus training with exam strategy for the medical entrance race.', '/courses/admission', 1, 2);
