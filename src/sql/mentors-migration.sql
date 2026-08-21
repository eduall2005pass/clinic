-- Mentors shown in the homepage mentors section.
-- The app also self-heals this table on first use (see src/lib/mentors.ts).
-- Apply manually if needed:
--   ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/mentors-migration.sql

CREATE TABLE IF NOT EXISTS mentors (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  note TEXT NULL,
  initials VARCHAR(8) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by VARCHAR(191) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the existing default mentors (safe to re-run).
INSERT IGNORE INTO mentors (id, name, subject, note, initials, is_active, sort_order) VALUES
  ('mentor-anika-rahman', 'Dr. Anika Rahman', 'Biology & Anatomy', 'Makes complex biology topics simple and exam-focused.', 'AR', 1, 1),
  ('mentor-shafiqul-islam', 'Prof. Shafiqul Islam', 'Chemistry', 'Guides students through every chapter with clarity.', 'SI', 1, 2),
  ('mentor-farhana-akter', 'Dr. Farhana Akter', 'Physics & Mathematics', 'Builds strong concepts with real exam practice.', 'FA', 1, 3);
