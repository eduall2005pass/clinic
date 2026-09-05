-- Q&A Ask a Question Card Maintenance (Admin Panel → Q&A Control)
-- Stores configurable content/appearance of the student "Ask a Question" card.
-- Single row with id='active' holds the live settings.

CREATE TABLE IF NOT EXISTS qa_ask_card_settings (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT 'Ask a Question',
  subtitle TEXT NULL,
  placeholder VARCHAR(1024) NULL,
  submit_label VARCHAR(255) NOT NULL DEFAULT 'Submit Question',
  cancel_label VARCHAR(255) NOT NULL DEFAULT 'Cancel',
  show_image_upload TINYINT(1) NOT NULL DEFAULT 1,
  guideline_text TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO qa_ask_card_settings (id, title, subtitle, placeholder, submit_label, cancel_label, show_image_upload, guideline_text)
VALUES (
  'active',
  'Ask a Question',
  'Select your category, enrolled course and subject, then write your question clearly.',
  'Type your question here...',
  'Submit Question',
  'Cancel',
  1,
  'Be specific — mention the chapter, topic or exam you are asking about.'
);
