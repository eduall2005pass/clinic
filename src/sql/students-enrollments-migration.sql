-- Student registration & enrollments (MySQL).
-- students  : one row per registered student (Firebase UID is the key)
-- student_ids : uniqueness guarantee for generated MS-XXXXXXXX IDs
-- courses   : registry of course IDs referenced by enrollments
-- enrollments : one row per student per course

CREATE TABLE IF NOT EXISTS students (
  uid VARCHAR(191) NOT NULL PRIMARY KEY,
  student_id VARCHAR(32) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  gender VARCHAR(32) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  hsc_batch VARCHAR(32) NOT NULL,
  contact_number VARCHAR(32) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  facebook_url VARCHAR(1024) NULL,
  profile_picture_url VARCHAR(1024) NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'google',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY students_student_id_unique (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_ids (
  student_id VARCHAR(32) NOT NULL PRIMARY KEY,
  uid VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  course_id VARCHAR(191) NOT NULL PRIMARY KEY,
  kind ENUM('free','paid') NOT NULL DEFAULT 'free'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_uid VARCHAR(191) NOT NULL,
  course_id VARCHAR(191) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  course_type VARCHAR(32) NOT NULL,
  course_kind ENUM('free','paid') NOT NULL DEFAULT 'free',
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  enrollment_status VARCHAR(32) NOT NULL DEFAULT 'active',
  enrollment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY enrollments_student_course_unique (student_uid, course_id),
  CONSTRAINT enrollments_student_fk FOREIGN KEY (student_uid) REFERENCES students (uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
