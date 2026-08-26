-- Public Exam: per-exam rules, negative-marking / second-timer settings,
-- category linkage and the featured-home-slider flag.
-- (Runtime ALTERs in src/lib/exams-admin.ts also apply these automatically.)

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(64) NULL AFTER answer_key,
  ADD COLUMN IF NOT EXISTS negative_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER negative_marks,
  ADD COLUMN IF NOT EXISTS negative_per_wrong DECIMAL(4,2) NOT NULL DEFAULT 0.25 AFTER negative_enabled,
  ADD COLUMN IF NOT EXISTS second_timer_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER negative_per_wrong,
  ADD COLUMN IF NOT EXISTS second_timer_deduction DECIMAL(6,2) NOT NULL DEFAULT 5 AFTER second_timer_enabled,
  ADD COLUMN IF NOT EXISTS featured TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

-- Preserve existing behaviour: Admission exams always graded with −0.25/wrong.
UPDATE exams SET negative_enabled = 1 WHERE course_type = 'Admission' AND negative_enabled = 0;

CREATE TABLE IF NOT EXISTS exam_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  rule_title VARCHAR(191) NOT NULL DEFAULT '',
  rule_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY exam_rules_exam_idx (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS negative_deduction DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timer_penalty DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_second_timer TINYINT(1) NOT NULL DEFAULT 0;
