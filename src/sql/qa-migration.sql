-- Q&A: subjects + student questions + teacher answers (MySQL)
CREATE TABLE IF NOT EXISTS qa_subjects (
  subject_id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_qa_subjects_pk (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qa_questions (
  question_id VARCHAR(40) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  student_uid VARCHAR(128) NULL,
  student_name VARCHAR(191) NOT NULL DEFAULT 'Student',
  text TEXT NOT NULL,
  answer_text TEXT NULL,
  answered_by VARCHAR(191) NULL,
  answered_at DATETIME NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'unanswered',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_qa_questions_pk (question_id),
  KEY idx_qa_questions_subject (subject_id),
  CONSTRAINT fk_qa_questions_subject FOREIGN KEY (subject_id)
    REFERENCES qa_subjects (subject_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
