-- Step 4: Paid-course enrollment applications (payment proof submitted by students).
-- One row per submitted application; stays 'pending_validation' until an admin acts.
CREATE TABLE IF NOT EXISTS enrollment_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_uid VARCHAR(191) NOT NULL,
  student_id VARCHAR(32) NOT NULL DEFAULT '',
  student_email VARCHAR(255) NOT NULL DEFAULT '',
  course_id VARCHAR(191) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  transaction_id VARCHAR(64) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL,
  sender_mobile VARCHAR(32) NOT NULL,
  application_status VARCHAR(32) NOT NULL DEFAULT 'pending_validation',
  coupon_code VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY enrollment_applications_txn_unique (transaction_id),
  KEY idx_enrollment_applications_student_course (student_uid, course_id),
  CONSTRAINT enrollment_applications_student_fk FOREIGN KEY (student_uid)
    REFERENCES students (uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
