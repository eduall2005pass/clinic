-- Payment Card configuration (Admin → Enrollment Control → Payment Card).
-- Single-row table: the bKash/Nagad numbers students pay to.
CREATE TABLE IF NOT EXISTS payment_card (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  bkash_number VARCHAR(40) NULL,
  nagad_number VARCHAR(40) NULL,
  bkash_enabled TINYINT(1) NOT NULL DEFAULT 1,
  nagad_enabled TINYINT(1) NOT NULL DEFAULT 0,
  instructions TEXT NULL,
  note TEXT NULL,
  updated_by VARCHAR(191) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
