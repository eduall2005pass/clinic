-- ═══════════════════════════════════════════════════════════════════════════
-- MediSpark Exam System — Foundational Architecture Migration
-- Common Exam Engine: supports both Public Exam and Course Exam
-- Only the access-control layer differs; the engine is shared.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Apply: ssh azureuser@VM 'sudo mysql bloodare_medispark' < src/sql/exam-system-architecture-migration.sql

-- ─── 1. EXAM CATEGORIES ─────────────────────────────────────────────────
-- Public Exam categories (SSC Academic, HSC Academic, Medical, Varsity).
CREATE TABLE IF NOT EXISTS exam_categories (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(32) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY exam_categories_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the 4 default public exam categories.
INSERT IGNORE INTO exam_categories (id, name, slug, icon, sort_order) VALUES
  ('ssc-academic', 'SSC Academic Exam', 'ssc-academic-exam', '📚', 1),
  ('hsc-academic', 'HSC Academic Exam', 'hsc-academic-exam', '🎓', 2),
  ('medical-admission', 'Medical Admission Exam', 'medical-admission-exam', '🏥', 3),
  ('varsity-admission', 'University Admission Exam', 'varsity-admission-exam', '🏛️', 4);

-- ─── 2. EXAM TYPE + ACTIVE + ATTEMPT LIMIT ───────────────────────────────
-- `type` distinguishes PUBLIC vs COURSE exams (access-control layer).
-- `active` allows soft-disable without deleting.
-- `attempt_limit` per-exam (overrides global setting when > 0).

-- Widen kind enum to include 'enrolled' if not already done.
ALTER TABLE exams
  MODIFY COLUMN kind ENUM('public','practice','enrolled') NOT NULL DEFAULT 'public';

-- Add type column (public/course).
ALTER TABLE exams ADD COLUMN IF NOT EXISTS type ENUM('public','course') NOT NULL DEFAULT 'public' AFTER kind;

-- Backfill type from kind: enrolled → course, everything else → public.
UPDATE exams SET type = 'course' WHERE kind = 'enrolled';
UPDATE exams SET type = 'public' WHERE kind IN ('public','practice');

-- Add active flag.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1 AFTER featured;

-- Add per-exam attempt limit (0 = use global default).
ALTER TABLE exams ADD COLUMN IF NOT EXISTS attempt_limit INT NOT NULL DEFAULT 0 AFTER second_timer_deduction;

-- ─── 3. EXAM QUESTION OPTIONS (normalized) ──────────────────────────────
-- Normalized options table. Options can exist independently of questions
-- for reusability. The JSON `options` column on exam_questions remains
-- for backward compat; this table is the source of truth going forward.
CREATE TABLE IF NOT EXISTS exam_question_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  option_index INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_eqo_question (question_id),
  KEY idx_eqo_correct (question_id, is_correct),
  CONSTRAINT fk_eqo_question FOREIGN KEY (question_id)
    REFERENCES exam_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. EXAM SESSIONS ───────────────────────────────────────────────────
-- Dedicated session tracking (separate from attempts for clarity).
-- Tracks device info, IP, and heartbeat for session protection.
CREATE TABLE IF NOT EXISTS exam_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  student_uid VARCHAR(191) NOT NULL,
  session_token VARCHAR(64) NOT NULL,
  status ENUM('active','terminated','expired') NOT NULL DEFAULT 'active',
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  UNIQUE KEY exam_sessions_token_unique (session_token),
  KEY idx_exam_sessions_exam_student (exam_id, student_uid),
  KEY idx_exam_sessions_status (status),
  KEY idx_exam_sessions_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. EXAM RANKINGS (pre-computed) ────────────────────────────────────
-- Pre-computed rankings for fast leaderboard queries.
-- Updated after each exam submission via the scoring engine.
CREATE TABLE IF NOT EXISTS exam_rankings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  student_uid VARCHAR(191) NOT NULL,
  student_name VARCHAR(255) NOT NULL DEFAULT '',
  student_id VARCHAR(32) NULL,
  score DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
  time_taken_seconds INT NULL,
  merit_position INT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY exam_rankings_exam_student (exam_id, student_uid),
  KEY idx_exam_rankings_exam_score (exam_id, score DESC, time_taken_seconds ASC),
  KEY idx_exam_rankings_position (exam_id, merit_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. HISTORICAL SCORING SNAPSHOT on exam_results ─────────────────────
-- Preserve the scoring configuration at the time of each attempt so
-- future exam edits do NOT alter historical results.
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS snapshot_marks DECIMAL(6,2) NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS snapshot_negative_per_wrong DECIMAL(4,2) NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS snapshot_second_timer_deduction DECIMAL(6,2) NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS snapshot_duration_minutes INT NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS snapshot_negative_enabled TINYINT(1) NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS snapshot_second_timer_enabled TINYINT(1) NULL;

-- Backfill snapshots from current exam settings (best-effort).
UPDATE exam_results r
  JOIN exams e ON e.id = r.exam_id
  SET r.snapshot_marks = e.total_marks,
      r.snapshot_negative_per_wrong = e.negative_per_wrong,
      r.snapshot_second_timer_deduction = e.second_timer_deduction,
      r.snapshot_duration_minutes = e.duration_minutes,
      r.snapshot_negative_enabled = e.negative_enabled,
      r.snapshot_second_timer_enabled = e.second_timer_enabled
  WHERE r.snapshot_marks IS NULL;

-- ─── 7. INDEXES for common query patterns ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exams_type ON exams(type);
CREATE INDEX IF NOT EXISTS idx_exams_active ON exams(active);
CREATE INDEX IF NOT EXISTS idx_exams_category_type ON exams(category_id, type);
CREATE INDEX IF NOT EXISTS idx_exams_status_active ON exams(status, active);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_uid);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_student ON exam_results(exam_id, student_uid);
CREATE INDEX IF NOT EXISTS idx_exam_enrollments_student ON exam_enrollments(student_uid);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_answers_exam ON exam_attempt_answers(exam_id, student_uid);
