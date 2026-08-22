import { exec, parseJsonColumn, query } from "@/lib/mysql";

// Admin Panel → Exams. Exams, question bank, enrollments, results and
// settings all live in MySQL. `exam_questions.exam_id = NULL` marks a
// bank-only question; the `answer_key` JSON column on `exams` stores
// per-question correct answers for published answer keys.

export type ExamKind = "public" | "practice";
export type ExamStatus = "draft" | "published" | "closed";

export type ExamQuestionOption = string;

export type Exam = {
  id: string;
  title: string;
  kind: ExamKind;
  batchId: string;
  subject: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  questionCount: number;
  status: ExamStatus;
  scheduledAt: string | null;
  answerKey: Record<string, number> | null;
};

export type ExamQuestion = {
  id: number | null;
  examId: string | null;
  subject: string;
  question: string;
  options: ExamQuestionOption[];
  correctIndex: number;
  explanation: string | null;
  marks: number;
  isActive: boolean;
};

export type ExamEnrollment = {
  id: number;
  examId: string;
  studentUid: string;
  studentName: string;
  enrolledAt: string;
};

export type ExamResult = {
  id: number;
  examId: string;
  studentUid: string;
  studentName: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
};

export type ExamSettings = {
  defaultDurationMinutes: number;
  negativeMarks: number;
  allowReview: boolean;
  showAnswersAfterSubmit: boolean;
  maxAttempts: number;
};

type ExamRow = {
  id: string;
  title: string;
  kind: string;
  batch_id: string;
  subject: string;
  course_type: string;
  duration_minutes: number;
  total_marks: number;
  negative_marks: string | number;
  question_count: number;
  status: string;
  scheduled_at: Date | string | null;
  answer_key: string | null;
};

type QuestionRow = {
  id: number;
  exam_id: string | null;
  bank_subject: string;
  question: string;
  options: string;
  correct_index: number;
  explanation: string | null;
  marks: string | number;
  is_active: number | boolean;
};

function toIso(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNumber(value: string | number | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function rowToExam(row: ExamRow): Exam {
  const parsedKey = parseJsonColumn<unknown>(row.answer_key);
  const answerKey: Record<string, number> | null =
    parsedKey && typeof parsedKey === "object" && !Array.isArray(parsedKey)
      ? (parsedKey as Record<string, number>)
      : null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind === "practice" ? "practice" : "public",
    batchId: row.batch_id ?? "",
    subject: row.subject ?? "",
    courseType: row.course_type === "Admission" ? "Admission" : "Academic",
    durationMinutes: row.duration_minutes ?? 30,
    totalMarks: row.total_marks ?? 0,
    negativeMarks: toNumber(row.negative_marks),
    questionCount: row.question_count ?? 0,
    status:
      row.status === "published"
        ? "published"
        : row.status === "closed"
          ? "closed"
          : "draft",
    scheduledAt: toIso(row.scheduled_at),
    answerKey,
  };
}

function rowToQuestion(row: QuestionRow): ExamQuestion {
  const options = parseJsonColumn<unknown[]>(row.options);
  return {
    id: row.id,
    examId: row.exam_id,
    subject: row.bank_subject ?? "",
    question: row.question,
    options: Array.isArray(options) ? options.map(String) : [],
    correctIndex: row.correct_index ?? 0,
    explanation: row.explanation,
    marks: toNumber(row.marks),
    isActive: Boolean(row.is_active),
  };
}

async function ensureTables(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    kind ENUM('public','practice') NOT NULL DEFAULT 'public',
    batch_id VARCHAR(32) NOT NULL DEFAULT '',
    subject VARCHAR(191) NOT NULL DEFAULT '',
    course_type ENUM('Academic','Admission') NOT NULL DEFAULT 'Academic',
    duration_minutes INT NOT NULL DEFAULT 30,
    total_marks INT NOT NULL DEFAULT 0,
    negative_marks DECIMAL(4,2) NOT NULL DEFAULT 0,
    question_count INT NOT NULL DEFAULT 0,
    status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
    scheduled_at DATETIME NULL,
    answer_key JSON NULL,
    created_by VARCHAR(191) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await exec(`CREATE TABLE IF NOT EXISTS exam_questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    exam_id VARCHAR(64) NULL,
    bank_subject VARCHAR(191) NOT NULL DEFAULT '',
    question TEXT NOT NULL,
    options JSON NOT NULL,
    correct_index INT NOT NULL DEFAULT 0,
    explanation TEXT NULL,
    marks DECIMAL(5,2) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

const EXAM_COLUMNS = `id, title, kind, batch_id, subject, course_type, duration_minutes,
  total_marks, negative_marks, question_count, status, scheduled_at, answer_key`;

// ── Exams CRUD ───────────────────────────────────────────────────────────

export async function fetchExams(kind?: ExamKind): Promise<Exam[]> {
  try {
    await ensureTables();
    const rows = kind
      ? await query<ExamRow[]>(`SELECT ${EXAM_COLUMNS} FROM exams WHERE kind = ? ORDER BY created_at DESC`, [kind])
      : await query<ExamRow[]>(`SELECT ${EXAM_COLUMNS} FROM exams ORDER BY created_at DESC`);
    return rows.map(rowToExam);
  } catch {
    return [];
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

/** Create or update an exam. Recomputes question_count/total_marks from linked questions when asked. */
export async function saveExam(
  input: Record<string, unknown>,
  adminUid: string,
): Promise<Exam> {
  await ensureTables();
  const id = asString(input.id);
  const title = asString(input.title);
  if (!/^[a-z0-9-]{2,64}$/.test(id)) {
    throw new Error("Exam id must be lowercase letters, numbers and dashes.");
  }
  if (title.length < 2) throw new Error("Exam title is required.");

  // Keep totals consistent with the linked questions.
  const totals = await query<{ count: number; marks: string | null }[]>(
    `SELECT COUNT(*) AS count, SUM(marks) AS marks FROM exam_questions WHERE exam_id = ? AND is_active = 1`,
    [id],
  );

  const scheduledRaw = asString(input.scheduledAt);
  const scheduledAt = scheduledRaw
    ? new Date(scheduledRaw).toISOString().slice(0, 19).replace("T", " ")
    : null;

  let answerKeyJson: string | null = null;
  if (input.answerKey && typeof input.answerKey === "object") {
    answerKeyJson = JSON.stringify(input.answerKey);
  }

  await exec(
    `INSERT INTO exams (${EXAM_COLUMNS}, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), kind = VALUES(kind), batch_id = VALUES(batch_id),
       subject = VALUES(subject), course_type = VALUES(course_type), duration_minutes = VALUES(duration_minutes),
       total_marks = VALUES(total_marks), negative_marks = VALUES(negative_marks),
       question_count = VALUES(question_count), status = VALUES(status),
       scheduled_at = VALUES(scheduled_at), answer_key = VALUES(answer_key), created_by = VALUES(created_by)`,
    [
      id,
      title,
      input.kind === "practice" ? "practice" : "public",
      asString(input.batchId),
      asString(input.subject),
      input.courseType === "Admission" ? "Admission" : "Academic",
      Math.max(1, Number(input.durationMinutes) || 30),
      Number(totals[0]?.marks ?? input.totalMarks) || 0,
      Math.max(0, Number(input.negativeMarks) || 0),
      totals[0]?.count ?? 0,
      ["draft", "published", "closed"].includes(String(input.status))
        ? String(input.status)
        : "draft",
      scheduledAt,
      answerKeyJson,
      adminUid,
    ],
  );

  const rows = await query<ExamRow[]>(`SELECT ${EXAM_COLUMNS} FROM exams WHERE id = ? LIMIT 1`, [id]);
  if (!rows[0]) throw new Error("Failed to save the exam.");
  return rowToExam(rows[0]);
}

export async function deleteExam(id: string): Promise<void> {
  await ensureTables();
  await exec(`DELETE FROM exam_questions WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exam_enrollments WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exam_results WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exams WHERE id = ?`, [id]);
}

// ── Question bank ────────────────────────────────────────────────────────

export async function fetchQuestions(
  filters: { examId?: string; subject?: string } = {},
): Promise<ExamQuestion[]> {
  try {
    await ensureTables();
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.examId) {
      where.push(filters.examId === "bank" ? "exam_id IS NULL" : "exam_id = ?");
      if (filters.examId !== "bank") params.push(filters.examId);
    }
    if (filters.subject) {
      where.push("bank_subject = ?");
      params.push(filters.subject);
    }
    const sql = `SELECT * FROM exam_questions ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT 500`;
    const rows = await query<QuestionRow[]>(sql, params);
    return rows.map(rowToQuestion);
  } catch {
    return [];
  }
}

export async function saveQuestion(
  input: Record<string, unknown>,
): Promise<ExamQuestion[]> {
  await ensureTables();
  const text = asString(input.question);
  if (text.length < 3) throw new Error("Question text is required.");
  const options = Array.isArray(input.options)
    ? input.options.map((option) => String(option))
    : [];
  if (options.length < 2 || options.some((option) => option.length === 0)) {
    throw new Error("At least two non-empty options are required.");
  }
  const correctIndex = Number(input.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    throw new Error("Correct answer index is out of range.");
  }
  const examId = asString(input.examId) || null;
  await exec(
    `INSERT INTO exam_questions (exam_id, bank_subject, question, options, correct_index, explanation, marks, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE exam_id = VALUES(exam_id), bank_subject = VALUES(bank_subject),
       question = VALUES(question), options = VALUES(options), correct_index = VALUES(correct_index),
       explanation = VALUES(explanation), marks = VALUES(marks), is_active = VALUES(is_active)`,
    [
      examId,
      asString(input.subject),
      text,
      JSON.stringify(options),
      correctIndex,
      asString(input.explanation) || null,
      Math.max(0.5, Number(input.marks) || 1),
      input.isActive === false ? 0 : 1,
    ],
  );
  await recomputeExamTotals(examId);
  return fetchQuestions({ examId: examId ?? "bank", subject: asString(input.subject) });
}

export async function deleteQuestion(id: number): Promise<void> {
  await ensureTables();
  const rows = await query<{ exam_id: string | null }[]>(
    `SELECT exam_id FROM exam_questions WHERE id = ? LIMIT 1`,
    [id],
  );
  await exec(`DELETE FROM exam_questions WHERE id = ?`, [id]);
  await recomputeExamTotals(rows[0]?.exam_id ?? null);
}

/** Keep exams.question_count / total_marks in sync with linked questions. */
async function recomputeExamTotals(examId: string | null): Promise<void> {
  if (!examId) return; // bank-only question — nothing to update
  try {
    const totals = await query<{ count: number; marks: string | null }[]>(
      `SELECT COUNT(*) AS count, SUM(marks) AS marks
       FROM exam_questions WHERE exam_id = ? AND is_active = 1`,
      [examId],
    );
    await exec(
      `UPDATE exams SET question_count = ?, total_marks = ? WHERE id = ?`,
      [
        totals[0]?.count ?? 0,
        Number(totals[0]?.marks ?? 0) || 0,
        examId,
      ],
    );
  } catch {
    // Best-effort sync.
  }
}

// ── Enrollments & Results ────────────────────────────────────────────────

async function ensureResultTables(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS exam_enrollments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL,
    student_uid VARCHAR(191) NOT NULL,
    student_name VARCHAR(255) NOT NULL DEFAULT '',
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY exam_enrollments_unique (exam_id, student_uid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await exec(`CREATE TABLE IF NOT EXISTS exam_results (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL,
    student_uid VARCHAR(191) NOT NULL,
    student_name VARCHAR(255) NOT NULL DEFAULT '',
    score DECIMAL(6,2) NOT NULL DEFAULT 0,
    total_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
    answers JSON NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY exam_results_exam_idx (exam_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

type EnrollmentRow = {
  id: number;
  exam_id: string;
  student_uid: string;
  student_name: string;
  enrolled_at: Date | string;
};

type ResultRow = EnrollmentRow & {
  score: string | number;
  total_marks: string | number;
  submitted_at: Date | string;
};

export async function fetchEnrollments(examId?: string): Promise<ExamEnrollment[]> {
  try {
    await ensureResultTables();
    const rows = examId
      ? await query<EnrollmentRow[]>(
          `SELECT * FROM exam_enrollments WHERE exam_id = ? ORDER BY enrolled_at DESC LIMIT 1000`,
          [examId],
        )
      : await query<EnrollmentRow[]>(
          `SELECT * FROM exam_enrollments ORDER BY enrolled_at DESC LIMIT 1000`,
        );
    return rows.map((row) => ({
      id: row.id,
      examId: row.exam_id,
      studentUid: row.student_uid,
      studentName: row.student_name,
      enrolledAt: toIso(row.enrolled_at) ?? "",
    }));
  } catch {
    return [];
  }
}

export async function fetchResults(examId?: string): Promise<ExamResult[]> {
  try {
    await ensureResultTables();
    const rows = examId
      ? await query<ResultRow[]>(
          `SELECT * FROM exam_results WHERE exam_id = ? ORDER BY submitted_at DESC LIMIT 1000`,
          [examId],
        )
      : await query<ResultRow[]>(
          `SELECT * FROM exam_results ORDER BY submitted_at DESC LIMIT 1000`,
        );
    return rows.map((row) => ({
      id: row.id,
      examId: row.exam_id,
      studentUid: row.student_uid,
      studentName: row.student_name,
      score: toNumber(row.score),
      totalMarks: toNumber(row.total_marks),
      submittedAt: toIso(row.submitted_at) ?? "",
    }));
  } catch {
    return [];
  }
}

export async function deleteResult(id: number): Promise<void> {
  await ensureResultTables();
  await exec(`DELETE FROM exam_results WHERE id = ?`, [id]);
}

// ── Settings ─────────────────────────────────────────────────────────────

type SettingsRow = {
  default_duration_minutes: number;
  negative_marks: string | number;
  allow_review: number | boolean;
  show_answers_after_submit: number | boolean;
  max_attempts: number;
};

async function ensureSettingsTable(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS exam_settings (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    default_duration_minutes INT NOT NULL DEFAULT 30,
    negative_marks DECIMAL(4,2) NOT NULL DEFAULT 0.25,
    allow_review TINYINT(1) NOT NULL DEFAULT 1,
    show_answers_after_submit TINYINT(1) NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(191) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await exec(`INSERT IGNORE INTO exam_settings (id) VALUES ('active')`);
}

const DEFAULT_SETTINGS: ExamSettings = {
  defaultDurationMinutes: 30,
  negativeMarks: 0.25,
  allowReview: true,
  showAnswersAfterSubmit: false,
  maxAttempts: 1,
};

export async function fetchExamSettings(): Promise<ExamSettings> {
  try {
    await ensureSettingsTable();
    const rows = await query<SettingsRow[]>(
      `SELECT * FROM exam_settings WHERE id = 'active' LIMIT 1`,
    );
    const row = rows[0];
    if (!row) return DEFAULT_SETTINGS;
    return {
      defaultDurationMinutes: row.default_duration_minutes ?? 30,
      negativeMarks: toNumber(row.negative_marks),
      allowReview: Boolean(row.allow_review),
      showAnswersAfterSubmit: Boolean(row.show_answers_after_submit),
      maxAttempts: row.max_attempts ?? 1,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveExamSettings(
  input: Record<string, unknown>,
  adminUid: string,
): Promise<ExamSettings> {
  await ensureSettingsTable();
  await exec(
    `UPDATE exam_settings SET
       default_duration_minutes = ?, negative_marks = ?, allow_review = ?,
       show_answers_after_submit = ?, max_attempts = ?, updated_by = ?
     WHERE id = 'active'`,
    [
      Math.max(1, Number(input.defaultDurationMinutes) || 30),
      Math.max(0, Number(input.negativeMarks) || 0),
      input.allowReview === false ? 0 : 1,
      input.showAnswersAfterSubmit ? 1 : 0,
      Math.max(1, Number(input.maxAttempts) || 1),
      adminUid,
    ],
  );
  return fetchExamSettings();
}
