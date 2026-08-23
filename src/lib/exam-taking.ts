import { randomUUID } from "node:crypto";
import { exec, parseJsonColumn, query } from "@/lib/mysql";
import { fetchExams, hasEnrolledExamAccess, type Exam } from "@/lib/exams-admin";

// Student-facing exam taking. MediSpark exam rules enforced here:
//  - answers are stored server-side and locked after the first selection
//  - forward-only navigation (client-side) with server-side answer storage
//  - negative marking ONLY for Medical Admission exams (−0.25 per wrong)
//  - starting an attempt on another device terminates + auto-submits the
//    previous session
// Questions are always sanitized (no correct answers leave the server).

export type TakingExam = {
  id: string;
  title: string;
  subject: string;
  batchId: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
};

/** MediSpark rule: negative marking only for Medical Admission exams. */
export function negativeMarksFor(courseType: string): number {
  return courseType === "Admission" ? 0.25 : 0;
}

export type TakingQuestion = {
  id: number;
  question: string;
  options: string[];
  marks: number;
};

export type SubmissionOutcome = {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  negativeMarks?: number;
  negativeDeduction?: number;
  meritPosition?: number | null;
  timeTakenSeconds?: number | null;
};

type ResultDetail = {
  questionId: number;
  chosenIndex: number | null;
  correctIndex: number;
  marks: number;
  /** Marks obtained for this question — negative when a wrong answer costs marks. */
  obtained: number;
};

/**
 * Merit positions for every result of an exam. Ranking: higher score first;
 * on equal marks the student who took less time ranks higher; still tied,
 * the earlier submission wins.
 */
async function updateMeritPositions(examId: string): Promise<void> {
  try {
    const ranked = await query<{ id: number }[]>(
      `SELECT id FROM exam_results
       WHERE exam_id = ?
       ORDER BY score DESC,
                COALESCE(time_taken_seconds, 2147483647) ASC,
                submitted_at ASC`,
      [examId],
    );
    for (const [index, row] of ranked.entries()) {
      await exec(`UPDATE exam_results SET merit_position = ? WHERE id = ?`, [
        index + 1,
        row.id,
      ]);
    }
  } catch {
    // Merit computation is best-effort; the stored result stays valid.
  }
}

type GradingQuestionRow = {
  id: number;
  correct_index: number;
  marks: string | number;
};

type AttemptRow = {
  session_token: string;
  status: string;
};

function isLivePublished(exam: Exam): boolean {
  return exam.status === "published";
}

let attemptTablesReady: Promise<void> | null = null;
function ensureAttemptTables(): Promise<void> {
  if (!attemptTablesReady) {
    attemptTablesReady = (async () => {
      await exec(`CREATE TABLE IF NOT EXISTS exam_attempts (
        exam_id VARCHAR(64) NOT NULL,
        student_uid VARCHAR(191) NOT NULL,
        session_token VARCHAR(64) NOT NULL,
        status ENUM('active','submitted') NOT NULL DEFAULT 'active',
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (exam_id, student_uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await exec(`CREATE TABLE IF NOT EXISTS exam_attempt_answers (
        exam_id VARCHAR(64) NOT NULL,
        student_uid VARCHAR(191) NOT NULL,
        question_id BIGINT UNSIGNED NOT NULL,
        option_index INT NOT NULL,
        answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (exam_id, student_uid, question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    })().catch((error) => {
      attemptTablesReady = null;
      throw error;
    });
  }
  return attemptTablesReady;
}

/**
 * Start (or take over) an attempt. If the student already has an ACTIVE
 * attempt (exam open on another device), that session is TERMINATED, its
 * stored answers are graded and saved automatically, then a fresh session
 * begins. Returns the session token for this device.
 */
async function startExamAttempt(
  examId: string,
  uid: string,
  studentName: string,
): Promise<string> {
  await ensureAttemptTables();
  const existing = await query<AttemptRow[]>(
    `SELECT session_token, status FROM exam_attempts WHERE exam_id = ? AND student_uid = ? LIMIT 1`,
    [examId, uid],
  );
  if (existing[0]?.status === "active") {
    // Terminate the previous session and auto-submit what it had answered.
    await finalizeAttempt(examId, uid, studentName, {});
  }
  const token = randomUUID();
  await exec(
    `INSERT INTO exam_attempts (exam_id, student_uid, session_token, status)
     VALUES (?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE session_token = VALUES(session_token), status = 'active'`,
    [examId, uid, token],
  );
  // Fresh session — clear any leftover answers.
  await exec(
    `DELETE FROM exam_attempt_answers WHERE exam_id = ? AND student_uid = ?`,
    [examId, uid],
  );
  return token;
}

/**
 * Store one selection. Server-enforced "answer only once": the first
 * accepted answer for a question wins; later changes are rejected.
 * If the token no longer matches (another device took over), the graded
 * outcome of this terminated session is returned.
 */
export async function saveExamAnswer(
  examId: string,
  uid: string,
  studentName: string,
  token: string,
  questionId: number,
  optionIndex: number,
): Promise<{
  accepted: boolean;
  terminated?: boolean;
  outcome?: SubmissionOutcome;
}> {
  await ensureAttemptTables();
  const attempts = await query<AttemptRow[]>(
    `SELECT session_token, status FROM exam_attempts WHERE exam_id = ? AND student_uid = ? LIMIT 1`,
    [examId, uid],
  );
  const attempt = attempts[0];
  if (!attempt || attempt.status !== "active") {
    return { accepted: false };
  }
  if (attempt.session_token !== token) {
    const outcome = await latestOutcome(examId, uid);
    return { accepted: false, terminated: true, outcome: outcome ?? undefined };
  }
  try {
    await exec(
      `INSERT INTO exam_attempt_answers (exam_id, student_uid, question_id, option_index)
       VALUES (?, ?, ?, ?)`,
      [examId, uid, questionId, optionIndex],
    );
    return { accepted: true };
  } catch {
    // Duplicate answer — locked after the first selection.
    return { accepted: false };
  }
}

async function fetchStoredAnswers(
  examId: string,
  uid: string,
): Promise<Record<string, number>> {
  const rows = await query<{ question_id: number | string; option_index: number }[]>(
    `SELECT question_id, option_index FROM exam_attempt_answers
     WHERE exam_id = ? AND student_uid = ?`,
    [examId, uid],
  );
  const answers: Record<string, number> = {};
  for (const row of rows) {
    answers[String(row.question_id)] = row.option_index;
  }
  return answers;
}

/** Grade stored (+ extra) answers with the negative-marking rule applied. */
function gradeAnswers(
  rows: GradingQuestionRow[],
  merged: Record<string, number>,
  negativePerWrong: number,
): Omit<SubmissionOutcome, "totalMarks"> & {
  totalMarks: number;
  details: ResultDetail[];
} {
  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const details: ResultDetail[] = [];

  for (const row of rows) {
    const chosen = merged[String(row.id)];
    const marks = Number(row.marks) || 1;
    if (typeof chosen !== "number") {
      skippedCount += 1;
      details.push({
        questionId: row.id,
        chosenIndex: null,
        correctIndex: row.correct_index,
        marks,
        obtained: 0,
      });
      continue;
    }
    if (chosen === row.correct_index) {
      score += marks;
      correctCount += 1;
      details.push({
        questionId: row.id,
        chosenIndex: chosen,
        correctIndex: row.correct_index,
        marks,
        obtained: marks,
      });
    } else {
      score -= negativePerWrong;
      wrongCount += 1;
      details.push({
        questionId: row.id,
        chosenIndex: chosen,
        correctIndex: row.correct_index,
        marks,
        obtained: -negativePerWrong,
      });
    }
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  const totalMarks =
    Math.round(rows.reduce((sum, row) => sum + (Number(row.marks) || 1), 0) * 100) /
    100;

  return {
    score,
    totalMarks,
    correctCount,
    wrongCount,
    skippedCount,
    negativeMarks: negativePerWrong,
    negativeDeduction:
      wrongCount > 0 && negativePerWrong > 0
        ? Math.round(negativePerWrong * wrongCount * 100) / 100
        : 0,
    details,
  };
}

/**
 * Close an attempt: grade stored (+ extra client) answers, persist the
 * result and mark the session submitted.
 */
async function finalizeAttempt(
  examId: string,
  uid: string,
  studentName: string,
  extraAnswers: Record<string, number>,
): Promise<SubmissionOutcome | null> {
  const exams = await fetchExams();
  const found = exams.find((exam) => exam.id === examId);
  if (!found) return null;

  const stored = await fetchStoredAnswers(examId, uid);
  const merged: Record<string, number> = { ...extraAnswers };
  for (const [key, value] of Object.entries(stored)) {
    merged[key] = value;
  }

  const rows = await query<GradingQuestionRow[]>(
    `SELECT id, correct_index, marks FROM exam_questions
     WHERE exam_id = ? AND is_active = 1`,
    [examId],
  );

  const negativePerWrong = negativeMarksFor(found.courseType);
  const graded = gradeAnswers(rows, merged, negativePerWrong);

  // Time taken = seconds between attempt start and submission (server clock).
  let timeTakenSeconds: number | null = null;
  try {
    const startedRows = await query<{ started_at: Date | string }[]>(
      `SELECT started_at FROM exam_attempts
       WHERE exam_id = ? AND student_uid = ? LIMIT 1`,
      [examId, uid],
    );
    const startedRaw = startedRows[0]?.started_at;
    if (startedRaw) {
      const startedMs = new Date(startedRaw).getTime();
      if (!Number.isNaN(startedMs)) {
        timeTakenSeconds = Math.min(
          86400,
          Math.max(0, Math.round((Date.now() - startedMs) / 1000)),
        );
      }
    }
  } catch {
    // Fall back to null — merit tie-break then uses submission order.
  }

  await exec(
    `INSERT INTO exam_enrollments (exam_id, student_uid, student_name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE student_name = VALUES(student_name)`,
    [examId, uid, studentName],
  );
  await exec(
    `INSERT INTO exam_results
       (exam_id, student_uid, student_name, score, total_marks, answers,
        details, time_taken_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      examId,
      uid,
      studentName,
      graded.score,
      graded.totalMarks,
      JSON.stringify(merged),
      JSON.stringify(graded.details),
      timeTakenSeconds,
    ],
  );
  await updateMeritPositions(examId);
  await exec(
    `UPDATE exam_attempts SET status = 'submitted' WHERE exam_id = ? AND student_uid = ?`,
    [examId, uid],
  );
  await exec(
    `DELETE FROM exam_attempt_answers WHERE exam_id = ? AND student_uid = ?`,
    [examId, uid],
  );

  let meritPosition: number | null = null;
  try {
    const positionRows = await query<{ merit_position: number | null }[]>(
      `SELECT merit_position FROM exam_results
       WHERE exam_id = ? AND student_uid = ?
       ORDER BY id DESC LIMIT 1`,
      [examId, uid],
    );
    meritPosition = positionRows[0]?.merit_position ?? null;
  } catch {
    // Leave null on failure.
  }

  return { ...graded, meritPosition, timeTakenSeconds };
}

/** Rebuild the outcome of the most recent stored result for this student. */
async function latestOutcome(
  examId: string,
  uid: string,
): Promise<SubmissionOutcome | null> {
  const rows = await query<
    { score: string | number; total_marks: string | number }[]
  >(
    `SELECT score, total_marks FROM exam_results
     WHERE exam_id = ? AND student_uid = ? ORDER BY id DESC LIMIT 1`,
    [examId, uid],
  );
  const row = rows[0];
  if (!row) return null;
  const exams = await fetchExams();
  const found = exams.find((exam) => exam.id === examId);
  const questions = await query<GradingQuestionRow[]>(
    `SELECT id, correct_index, marks FROM exam_questions WHERE exam_id = ? AND is_active = 1`,
    [examId],
  );
  // Counts come from the last stored answers snapshot when available.
  const resultRows = await query<{ answers: string | null }[]>(
    `SELECT answers FROM exam_results WHERE exam_id = ? AND student_uid = ?
     ORDER BY id DESC LIMIT 1`,
    [examId, uid],
  );
  const parsed = parseJsonColumn<Record<string, number>>(resultRows[0]?.answers);
  const answers = parsed && typeof parsed === "object" ? parsed : {};
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  for (const question of questions) {
    const chosen = answers[String(question.id)];
    if (typeof chosen !== "number") skippedCount += 1;
    else if (chosen === question.correct_index) correctCount += 1;
    else wrongCount += 1;
  }
  const negativePerWrong = negativeMarksFor(found?.courseType ?? "Academic");
  const score = Number(row.score) || 0;
  return {
    score,
    totalMarks: Number(row.total_marks) || 0,
    correctCount,
    wrongCount,
    skippedCount,
    negativeMarks: negativePerWrong,
    negativeDeduction:
      wrongCount > 0 && negativePerWrong > 0
        ? Math.round(negativePerWrong * wrongCount * 100) / 100
        : 0,
  };
}

export async function getExamForTaking(
  examId: string,
  uid?: string,
  studentName?: string,
): Promise<{
  exam: TakingExam;
  questions: TakingQuestion[];
  sessionToken: string | null;
} | null> {
  const exams = await fetchExams();
  const found = exams.find((exam) => exam.id === examId);
  if (!found || !isLivePublished(found)) return null;
  // Enrolled exams are only visible to students enrolled in an assigned course.
  if (found.kind === "enrolled") {
    if (!uid || !(await hasEnrolledExamAccess(examId, uid))) return null;
  }

  const optionRows = await query<
    { id: number; question: string; options: string; marks: string | number }[]
  >(
    `SELECT id, question, options, marks FROM exam_questions
     WHERE exam_id = ? AND is_active = 1 ORDER BY id ASC`,
    [examId],
  );

  const questions: TakingQuestion[] = [];
  for (const row of optionRows) {
    const parsed = parseJsonColumn<unknown[]>(row.options);
    if (Array.isArray(parsed)) {
      questions.push({
        id: row.id,
        question: row.question,
        options: parsed.map(String),
        marks: Number(row.marks) || 1,
      });
    }
  }

  return {
    exam: {
      id: found.id,
      title: found.title,
      subject: found.subject,
      batchId: found.batchId,
      courseType: found.courseType,
      durationMinutes: found.durationMinutes,
      totalMarks: questions.reduce((sum, item) => sum + item.marks, 0),
      // Rule-based: −0.25 per wrong for Medical Admission, none for HSC.
      negativeMarks: negativeMarksFor(found.courseType),
    },
    questions,
    sessionToken:
      uid && questions.length > 0
        ? await startExamAttempt(examId, uid, studentName || "Student")
        : null,
  };
}

export async function submitExamAttempt(
  examId: string,
  uid: string,
  studentName: string,
  answers: Record<string, number>,
): Promise<SubmissionOutcome | null> {
  const exams = await fetchExams();
  const found = exams.find((exam) => exam.id === examId);
  if (!found || !isLivePublished(found)) return null;
  // Enrolled exams can only be submitted by students enrolled in an assigned course.
  if (found.kind === "enrolled" && !(await hasEnrolledExamAccess(examId, uid))) {
    return null;
  }

  await ensureAttemptTables();

  // Already submitted (double-submit / auto-submit race / terminated by
  // another device) → return the stored result instead of re-grading.
  const attempts = await query<AttemptRow[]>(
    `SELECT session_token, status FROM exam_attempts WHERE exam_id = ? AND student_uid = ? LIMIT 1`,
    [examId, uid],
  );
  if (attempts[0]?.status === "submitted") {
    return latestOutcome(examId, uid);
  }

  return finalizeAttempt(examId, uid, studentName, answers);
}
