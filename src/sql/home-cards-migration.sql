-- Homepage info cards ("Why MediSpark" benefits + "Our Success" stats)
CREATE TABLE IF NOT EXISTS home_cards (
  card_key VARCHAR(64) NOT NULL,
  section VARCHAR(16) NOT NULL DEFAULT 'why',
  title VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  value VARCHAR(64) NULL,
  icon VARCHAR(32) NOT NULL DEFAULT 'book',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_home_cards_pk (card_key),
  KEY idx_home_cards_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
