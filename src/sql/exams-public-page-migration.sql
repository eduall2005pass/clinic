-- Admin Panel Public Exam page = Main Website Public Exam page.
-- Exams gain a public description and banner image so the admin can manage
-- everything students see on the Public Exam pages.

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER title;

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS banner_url VARCHAR(1024) NULL AFTER description;
