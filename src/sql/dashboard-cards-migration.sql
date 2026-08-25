-- Custom Student Dashboard cards managed via Admin → Dashboard Control.
-- Each row is one card; students only see is_active = 1 rows.
-- GIPK: no explicit PK — the logical key lives in uq_dashboard_cards_pk.

CREATE TABLE IF NOT EXISTS dashboard_cards (
  card_key VARCHAR(191) NOT NULL,
  title VARCHAR(191) NOT NULL,
  description VARCHAR(512) NULL,
  href VARCHAR(512) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'book',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dashboard_cards_pk (card_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
