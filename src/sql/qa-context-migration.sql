-- Q&A course context: every question stores Category + Enrolled Course +
-- Subject (Course Control ids) plus an optional picture URL. Apply with:
--   ssh <vm> 'sudo mysql bloodare_medispark' < src/sql/qa-context-migration.sql
ALTER TABLE qa_questions
  ADD COLUMN category_id VARCHAR(191) NULL AFTER subject_id,
  ADD COLUMN course_id VARCHAR(191) NULL AFTER category_id,
  ADD COLUMN image_url VARCHAR(1024) NULL AFTER course_id;

CREATE INDEX idx_qa_questions_course ON qa_questions (course_id);

-- Legacy installs may have this FK (qa-migration.sql). Questions now
-- reference Course Control subjects, so the FK must be removed. Run only
-- if it exists:
-- ALTER TABLE qa_questions DROP FOREIGN KEY fk_qa_questions_subject;
