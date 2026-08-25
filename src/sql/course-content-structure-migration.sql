-- Course-wise content structure on the live website.
--
-- 1) catalog_courses.content_layout — Admin picks which content structure a
--    course uses:
--      'auto'    → legacy name-based heuristic (SSC Biology / Botany /
--                  Zoology ⇒ direct; single-subject HSC Biology Crash /
--                  Varsity Biology ⇒ paper selection; multi-subject ⇒
--                  subject selection)
--      'direct'  → Course Content page with Class / Exam / Materials cards
--      'paper'   → Paper Selection page (১ম পত্র / ২য় পত্র), then cards
--      'subject' → Subject Selection page (8 Medical Admission subjects),
--                  then per-subject cards
-- 2) exams.sort_order — admin-controlled ordering of exams inside a chapter.

ALTER TABLE catalog_courses
  ADD COLUMN IF NOT EXISTS content_layout ENUM('auto','direct','paper','subject')
  NOT NULL DEFAULT 'auto' AFTER availability;

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER chapter_id;
