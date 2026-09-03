-- PDF Materials — structured MCQ documents for Material PDF Generator
CREATE TABLE IF NOT EXISTS pdf_materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NULL,
  chapter VARCHAR(255) NULL,
  batch VARCHAR(255) NULL,
  institution VARCHAR(255) NULL,
  header_enabled TINYINT(1) NOT NULL DEFAULT 1,
  show_page_numbers TINYINT(1) NOT NULL DEFAULT 1,
  payload JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pdf_materials_active (is_active),
  INDEX idx_pdf_materials_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
