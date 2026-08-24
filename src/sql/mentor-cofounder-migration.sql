-- Mentor designations: add the Co-Founder flag alongside Founder/Developer.
-- The main website renders up to three rounded-square designation containers
-- per mentor card, only for the flags enabled in the Admin Panel:
--   "Founder of MediSpark"      (is_founder)
--   "Co-Founder of MediSpark"   (is_co_founder)
--   "Developer of MediSpark"    (is_developer)

ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_co_founder TINYINT(1) NOT NULL DEFAULT 0 AFTER is_founder;
