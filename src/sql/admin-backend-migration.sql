-- Admin Panel backend — courses, exams, administration, content, profile.
-- Mirrors the ensure-table statements in src/lib/*-admin.ts / *.ts.

-- ── Courses module ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_courses (
  slug VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('Academic','Admission') NOT NULL DEFAULT 'Academic',
  batch_id VARCHAR(32) NOT NULL DEFAULT 'hsc-28',
  image_url VARCHAR(1024) NULL,
  short_description TEXT NULL,
  description TEXT NULL,
  teacher_name VARCHAR(255) NOT NULL DEFAULT '',
  teacher_photo_url VARCHAR(1024) NULL,
  teacher_designation VARCHAR(255) NOT NULL DEFAULT '',
  duration VARCHAR(128) NOT NULL DEFAULT '',
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_fee DECIMAL(10,2) NULL,
  features JSON NULL,
  overview_title VARCHAR(191) NOT NULL DEFAULT '',
  overview JSON NULL,
  status ENUM('published','unpublished') NOT NULL DEFAULT 'unpublished',
  availability ENUM('available','hidden') NOT NULL DEFAULT 'available',
  coupon_enabled TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_categories (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_subjects (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_chapters (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  subject_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_classes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  chapter_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  video_url VARCHAR(1024) NULL,
  note_url VARCHAR(1024) NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  is_free TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  code VARCHAR(64) NOT NULL PRIMARY KEY,
  discount_type ENUM('percent','flat') NOT NULL DEFAULT 'percent',
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 0,
  used_count INT NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Exams module ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  kind ENUM('public','practice') NOT NULL DEFAULT 'public',
  batch_id VARCHAR(32) NOT NULL DEFAULT '',
  subject VARCHAR(191) NOT NULL DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 30,
  total_marks INT NOT NULL DEFAULT 0,
  negative_marks DECIMAL(4,2) NOT NULL DEFAULT 0,
  question_count INT NOT NULL DEFAULT 0,
  status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  scheduled_at DATETIME NULL,
  answer_key JSON NULL,
  created_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id VARCHAR(64) NULL,
  bank_subject VARCHAR(191) NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index INT NOT NULL DEFAULT 0,
  explanation TEXT NULL,
  marks DECIMAL(5,2) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_enrollments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  student_uid VARCHAR(191) NOT NULL,
  student_name VARCHAR(255) NOT NULL DEFAULT '',
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY exam_enrollments_unique (exam_id, student_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  student_uid VARCHAR(191) NOT NULL,
  student_name VARCHAR(255) NOT NULL DEFAULT '',
  score DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
  answers JSON NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY exam_results_exam_idx (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_settings (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  default_duration_minutes INT NOT NULL DEFAULT 30,
  negative_marks DECIMAL(4,2) NOT NULL DEFAULT 0.25,
  allow_review TINYINT(1) NOT NULL DEFAULT 1,
  show_answers_after_submit TINYINT(1) NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO exam_settings (id) VALUES ('active');

-- ── Administration module ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
  email VARCHAR(191) NOT NULL PRIMARY KEY,
  role VARCHAR(64) NOT NULL DEFAULT 'admin',
  permissions JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_uid VARCHAR(191) NOT NULL DEFAULT '',
  admin_email VARCHAR(191) NOT NULL DEFAULT '',
  action VARCHAR(191) NOT NULL,
  detail TEXT NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY admin_activity_logs_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_settings (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  allowed_email_domains JSON NULL,
  max_login_attempts INT NOT NULL DEFAULT 5,
  session_timeout_minutes INT NOT NULL DEFAULT 120,
  require_strong_password TINYINT(1) NOT NULL DEFAULT 0,
  block_suspicious_ips TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO security_settings (id) VALUES ('active');

-- ── Content module ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  audience ENUM('all','students','admins') NOT NULL DEFAULT 'all',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jerseys (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  note TEXT NULL,
  image_url VARCHAR(1024) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Admin profile ────────────────────────────────────────────────────────
ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1024) NULL;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32) NULL;
