-- Exam System v2: rule templates + question image + rule_template linkage
CREATE TABLE IF NOT EXISTS exam_rule_templates (
  template_key VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  negative_enabled TINYINT(1) NOT NULL DEFAULT 0,
  negative_per_wrong DECIMAL(4,2) NOT NULL DEFAULT 0,
  second_timer_enabled TINYINT(1) NOT NULL DEFAULT 0,
  second_timer_deduction DECIMAL(6,2) NOT NULL DEFAULT 0,
  rules JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO exam_rule_templates (template_key, name, negative_enabled, negative_per_wrong, second_timer_enabled, second_timer_deduction) VALUES
  ('medical', 'Medical Rules', 1, 0.25, 1, 5),
  ('academic', 'Academic Rules', 0, 0, 0, 0),
  ('university', 'University Rules', 1, 0.25, 0, 0);

-- Link selected template to each exam; controls actual behavior.
ALTER TABLE exams ADD COLUMN rule_template VARCHAR(32) NULL AFTER category_id;

-- question image (optional per-question)
ALTER TABLE exam_questions ADD COLUMN question_image VARCHAR(1024) NULL AFTER question;
