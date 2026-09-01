-- Exam ranking indexes — audit fix.
-- Covers:
--  1) ranking ORDER BY (exam_id, score, time_taken_seconds, submitted_at)
--  2) second-timer repeat check (student_uid, exam_id)
--  3) exam_attempt_answers (exam_id, student_uid, question_id) already has
--     PRIMARY KEY (exam_id, student_uid, question_id) — no extra index needed.
--
-- Azure Database for MySQL (MySQL 8) does NOT support CREATE INDEX IF NOT EXISTS.
-- Run via application-level try/catch or handle ER_DUP_KEYNAME (errno 1061) as
-- a no-op. Example pattern:
--   try { await exec('CREATE INDEX idx_... ON exam_results (...)'); } catch (e) {
--     if ((e as {code?:string}).code !== 'ER_DUP_KEYNAME') throw e;
--   }
-- For sql-file apply, just run plain CREATE INDEX; re-running will error
-- with duplicate-key and should be ignored.

-- 1) Ranking: SELECT id FROM exam_results WHERE exam_id = ? ORDER BY score DESC, time_taken_seconds ASC, submitted_at ASC
CREATE INDEX idx_exam_results_ranking ON exam_results (exam_id, score, time_taken_seconds, submitted_at);

-- 2) Second-timer check: SELECT COUNT(*) FROM exam_results WHERE exam_id = ? AND student_uid = ?
CREATE INDEX idx_exam_results_student_exam ON exam_results (student_uid, exam_id);

-- 3) exam_attempt_answers PK already covers (exam_id, student_uid, question_id):
-- PRIMARY KEY (exam_id, student_uid, question_id) — see ensureAttemptTables() in src/lib/exam-taking.ts
