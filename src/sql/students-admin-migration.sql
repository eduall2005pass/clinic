-- Students admin management — account activation state.
-- Protected auth credentials (uid, provider, Firebase identity) are NOT modifiable.

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;
