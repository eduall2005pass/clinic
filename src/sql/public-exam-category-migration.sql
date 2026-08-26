-- Public Exams belong to a Course Control category (synced master data)
-- and can be marked ★ Featured for the homepage slider.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS category_id VARCHAR(64) NULL;
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams (category_id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS featured TINYINT(1) NOT NULL DEFAULT 0;
