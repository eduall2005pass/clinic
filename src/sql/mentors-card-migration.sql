-- Mentor Profile Card upgrade — qualification line + Founder/Developer toggles.
-- Apply after src/sql/mentors-migration.sql and mentors-extended-migration.sql.

ALTER TABLE mentors ADD COLUMN IF NOT EXISTS qualification VARCHAR(255) NULL AFTER subject;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_founder TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_developer TINYINT(1) NOT NULL DEFAULT 0 AFTER is_founder;
