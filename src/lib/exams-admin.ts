import { exec, parseJsonColumn, query, ensureColumn } from "@/lib/mysql";
import { seedDefaultExamRules } from "@/lib/exam-rules";

let ensureSettingsTableReady = false;
let ensureResultTablesReady = false;
// Admin Panel → Exams. Exams, question bank, enrollments, results and
// settings all live in MySQL. `exam_questions.exam_id = NULL` marks a
// bank-only question; the `answer_key` JSON column on `exams` stores
// per-question correct answers for published answer keys.

export type ExamKind = "public" | "practice" | "enrolled";
export type ExamType = "public" | "course";
export type ExamStatus = "draft" | "published" | "closed";

export const EXAM_KINDS: ExamKind[] = ["public", "practice", "enrolled"];

export type ExamQuestionOption = string;

export type Exam = {
  id: string;
  title: string;
  /** Public description shown on the exam details page. */
  description: string | null;
  /** Public banner image shown on the exam details page. */
  bannerUrl: string | null;
  kind: ExamKind;
  batchId: string;
  subject: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  /** Admin ON/OFF — when true, wrong answers cost `negativePerWrong`. */
  negativeEnabled: boolean;
  negativePerWrong: number;
  /** Admin ON/OFF — repeat attempt of the SAME exam loses marks. */
  secondTimerEnabled: boolean;
  secondTimerDeduction: number;
  questionCount: number;
  status: ExamStatus;
  /** Featured public exams auto-appear as homepage slider slides. */
  featured: boolean;
  scheduledAt: string | null;
  endsAt: string | null;
  answerKey: Record<string, number> | null;
  /** Courses whose enrolled students may take this exam (kind = "enrolled"). */
  courseIds: string[];
  /** Chapter this exam belongs to (course content Exam card). */
  chapterId: string | null;
  /** Admin-controlled display order inside a chapter. */
  sortOrder: number;
  /** Public Exam Control category (synced from Course Control categories). */
  categoryId?: string | null;
  /** Public Exam = PUBLIC, Course Exam = COURSE (access-control layer). */
  examType: ExamType;
  /** Soft-disable flag — inactive exams are hidden from students. */
  active: boolean;
  /** Per-exam attempt limit (0 = use global default). */
  attemptLimit: number;
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
  meritPosition: number | null;
  timeTakenSeconds: number | null;
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
  description: string | null;
  banner_url: string | null;
  kind: string;
  type: string;
  batch_id: string;
  subject: string;
  course_type: string;
  duration_minutes: number;
  total_marks: number;
  negative_marks: string | number;
  negative_enabled?: number | boolean;
  negative_per_wrong?: string | number;
  second_timer_enabled?: number | boolean;
  second_timer_deduction?: string | number;
  attempt_limit?: number | null;
  question_count: number;
  status: string;
  active?: number | boolean;
  featured?: number | boolean;
  scheduled_at: Date | string | null;
  ends_at?: Date | string | null;
  answer_key: string | null;
  chapter_id: string | null;
  sort_order?: string | number | null;
  category_id?: string | null;
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

function toIso(value: Date | string | null | undefined): string | null {
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
    description: row.description ?? null,
    bannerUrl: row.banner_url ?? null,
    kind:
      row.kind === "practice"
        ? "practice"
        : row.kind === "enrolled"
          ? "enrolled"
          : "public",
    examType: row.type === "course" ? "course" : "public",
    batchId: row.batch_id ?? "",
    subject: row.subject ?? "",
    courseType: row.course_type === "Admission" ? "Admission" : "Academic",
    durationMinutes: row.duration_minutes ?? 30,
    totalMarks: row.total_marks ?? 0,
    negativeMarks: toNumber(row.negative_marks),
    negativeEnabled:
      row.negative_enabled === undefined
        ? row.course_type === "Admission"
        : Boolean(row.negative_enabled),
    negativePerWrong:
      row.negative_per_wrong === undefined || row.negative_per_wrong === null
        ? 0.25
        : toNumber(row.negative_per_wrong as string | number),
    secondTimerEnabled: Boolean(row.second_timer_enabled),
    secondTimerDeduction:
      row.second_timer_deduction === undefined ||
      row.second_timer_deduction === null
        ? 5
        : toNumber(row.second_timer_deduction as string | number),
    attemptLimit: row.attempt_limit != null ? Number(row.attempt_limit) : 0,
    questionCount: row.question_count ?? 0,
    status:
      row.status === "published"
        ? "published"
        : row.status === "closed"
          ? "closed"
          : "draft",
    active: row.active === undefined ? true : Boolean(row.active),
    featured: Boolean(row.featured),
    scheduledAt: toIso(row.scheduled_at),
    endsAt: toIso(row.ends_at),
    answerKey,
    courseIds: [],
    chapterId: row.chapter_id ?? null,
    sortOrder: toNumber(row.sort_order ?? null),
    categoryId: row.category_id ?? null,
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
    ends_at DATETIME NULL,
    answer_key JSON NULL,
    created_by VARCHAR(191) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Exams created before end-time support need the column added.
  try {
    await ensureColumn("exams", "ends_at", "DATETIME NULL AFTER scheduled_at");
  } catch {
    // Best effort — column may already exist.
  }
  // Enrolled exams: widen the kind enum (older installs lack 'enrolled').
  try {
    await exec(
      `ALTER TABLE exams MODIFY COLUMN kind ENUM('public','practice','enrolled') NOT NULL DEFAULT 'public'`,
    );
  } catch {
    // Best effort — already widened.
  }
  // Chapter linkage for the student course-content Exam card.
  try {
    await ensureColumn("exams", "chapter_id", "VARCHAR(64) NULL AFTER subject");
  } catch {
    // Best effort — column may already exist.
  }
  // Admin-controlled exam ordering inside a chapter.
  try {
    await ensureColumn("exams", "sort_order", "INT NOT NULL DEFAULT 0 AFTER chapter_id");
  } catch {
    // Best effort — column may already exist.
  }
  // Public exam page content managed from the Admin Panel.
  try {
    await ensureColumn("exams", "description", "TEXT NULL AFTER title");
    await ensureColumn("exams", "banner_url", "VARCHAR(1024) NULL AFTER description");
  } catch {
    // Best effort — columns may already exist.
  }
  // Per-exam grading settings + category linkage + featured slider flag.
  try {
    await ensureColumn("exams", "category_id", "`category_id` VARCHAR(64) NULL AFTER answer_key");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await ensureColumn("exams", "negative_enabled", "`negative_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER negative_marks");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await ensureColumn("exams", "negative_per_wrong", "`negative_per_wrong` DECIMAL(4,2) NOT NULL DEFAULT 0.25 AFTER negative_enabled");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await ensureColumn("exams", "second_timer_enabled", "`second_timer_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER negative_per_wrong");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await ensureColumn("exams", "second_timer_deduction", "`second_timer_deduction` DECIMAL(6,2) NOT NULL DEFAULT 5 AFTER second_timer_enabled");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await ensureColumn("exams", "featured", "`featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER status");
  } catch {
    // Best effort — column may already exist.
  }
  // ── Exam architecture: type, active, attempt_limit ──
  try {
    await ensureColumn("exams", "type", "`type` ENUM('public','course') NOT NULL DEFAULT 'public' AFTER kind");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await exec(`UPDATE exams SET type = 'course' WHERE kind = 'enrolled'`);
    await exec(`UPDATE exams SET type = 'public' WHERE kind IN ('public','practice')`);
  } catch {
    // Best effort — type column may not exist yet.
  }
  try {
    await ensureColumn("exams", "active", "`active` TINYINT(1) NOT NULL DEFAULT 1 AFTER featured");
  } catch {
    // Best effort — column may already exist.
  }
  try {
    await ensureColumn("exams", "attempt_limit", "`attempt_limit` INT NOT NULL DEFAULT 0 AFTER second_timer_deduction");
  } catch {
    // Best effort — column may already exist.
  }
  // Preserve legacy behaviour: Admission exams always had −0.25 per wrong.
  try {
    await exec(`UPDATE exams SET negative_enabled = 1 WHERE course_type = 'Admission' AND negative_enabled = 0`);
  } catch {
    // Best effort — column may not exist yet (apply the SQL migration).
  }
  // ── Exam categories (Public Exam Control) ──
  await exec(`CREATE TABLE IF NOT EXISTS exam_categories (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(32) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY exam_categories_slug_unique (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Seed default public exam categories.
  try {
    await exec(`INSERT IGNORE INTO exam_categories (id, name, slug, icon, sort_order) VALUES
      ('ssc-academic', 'SSC Academic Exam', 'ssc-academic-exam', '📚', 1),
      ('hsc-academic', 'HSC Academic Exam', 'hsc-academic-exam', '🎓', 2),
      ('medical-admission', 'Medical Admission Exam', 'medical-admission-exam', '🏥', 3),
      ('varsity-admission', 'University Admission Exam', 'varsity-admission-exam', '🏛️', 4)`);
  } catch {
    // Best effort — categories may already exist.
  }
  await exec(`CREATE TABLE IF NOT EXISTS exam_courses (
    exam_id VARCHAR(64) NOT NULL,
    course_id VARCHAR(191) NOT NULL,
    PRIMARY KEY (exam_id, course_id)
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
  // ── Normalized question options ──
  await exec(`CREATE TABLE IF NOT EXISTS exam_question_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT UNSIGNED NOT NULL,
    option_index INT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_eqo_question (question_id),
    KEY idx_eqo_correct (question_id, is_correct),
    CONSTRAINT fk_eqo_question FOREIGN KEY (question_id)
      REFERENCES exam_questions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // ── Exam sessions (heartbeat, device, IP tracking) ──
  await exec(`CREATE TABLE IF NOT EXISTS exam_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL,
    student_uid VARCHAR(191) NOT NULL,
    session_token VARCHAR(64) NOT NULL,
    status ENUM('active','terminated','expired') NOT NULL DEFAULT 'active',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    UNIQUE KEY exam_sessions_token_unique (session_token),
    KEY idx_exam_sessions_exam_student (exam_id, student_uid),
    KEY idx_exam_sessions_status (status),
    KEY idx_exam_sessions_started (started_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // ── Exam rankings (pre-computed for fast leaderboard) ──
  await exec(`CREATE TABLE IF NOT EXISTS exam_rankings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL,
    student_uid VARCHAR(191) NOT NULL,
    student_name VARCHAR(255) NOT NULL DEFAULT '',
    student_id VARCHAR(32) NULL,
    score DECIMAL(6,2) NOT NULL DEFAULT 0,
    total_marks DECIMAL(6,2) NOT NULL DEFAULT 0,
    time_taken_seconds INT NULL,
    merit_position INT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY exam_rankings_exam_student (exam_id, student_uid),
    KEY idx_exam_rankings_exam_score (exam_id, score DESC, time_taken_seconds ASC),
    KEY idx_exam_rankings_position (exam_id, merit_position)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // ── Historical scoring snapshot on exam_results ──
  try {
    await ensureColumn("exam_results", "snapshot_marks", "`snapshot_marks` DECIMAL(6,2) NULL");
    await ensureColumn("exam_results", "snapshot_negative_per_wrong", "`snapshot_negative_per_wrong` DECIMAL(4,2) NULL");
    await ensureColumn("exam_results", "snapshot_second_timer_deduction", "`snapshot_second_timer_deduction` DECIMAL(6,2) NULL");
    await ensureColumn("exam_results", "snapshot_duration_minutes", "`snapshot_duration_minutes` INT NULL");
    await ensureColumn("exam_results", "snapshot_negative_enabled", "`snapshot_negative_enabled` TINYINT(1) NULL");
    await ensureColumn("exam_results", "snapshot_second_timer_enabled", "`snapshot_second_timer_enabled` TINYINT(1) NULL");
  } catch {
    // Best effort — columns may already exist.
  }
}

const EXAM_COLUMNS = `id, title, description, banner_url, kind, type, batch_id,
  subject, chapter_id, sort_order, course_type, duration_minutes,
  total_marks, negative_marks, negative_enabled, negative_per_wrong,
  second_timer_enabled, second_timer_deduction, attempt_limit,
  question_count, status, active,
  featured, scheduled_at, ends_at, answer_key, category_id`;

// ── Exams CRUD ───────────────────────────────────────────────────────────

/** exam_id → assigned course ids (for enrolled exams). */
async function fetchCourseAssignments(): Promise<Map<string, string[]>> {
  const rows = await query<{ exam_id: string; course_id: string }[]>(
    `SELECT exam_id, course_id FROM exam_courses ORDER BY course_id ASC`,
  );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.exam_id) ?? [];
    list.push(row.course_id);
    map.set(row.exam_id, list);
  }
  return map;
}

export async function fetchExams(kind?: ExamKind): Promise<Exam[]> {
  try {
    await ensureTables();
    const rows = kind
      ? await query<ExamRow[]>(`SELECT ${EXAM_COLUMNS} FROM exams WHERE kind = ? ORDER BY sort_order ASC, created_at DESC`, [kind])
      : await query<ExamRow[]>(`SELECT ${EXAM_COLUMNS} FROM exams ORDER BY sort_order ASC, created_at DESC`);
    let assignments: Map<string, string[]> | null = null;
    if (rows.some((row) => row.kind === "enrolled")) {
      assignments = await fetchCourseAssignments();
    }
    return rows.map((row) => {
      const exam = rowToExam(row);
      exam.courseIds = assignments?.get(exam.id) ?? [];
      return exam;
    });
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
  const endsRaw = asString(input.endsAt);
  let endsAt: string | null = null;
  if (endsRaw) {
    const endDate = new Date(endsRaw);
    if (!Number.isNaN(endDate.getTime()) && scheduledAt && endDate <= new Date(scheduledAt)) {
      throw new Error("End time must be after the start time.");
    }
    endsAt = endDate.toISOString().slice(0, 19).replace("T", " ");
  }

  let answerKeyJson: string | null = null;
  if (input.answerKey && typeof input.answerKey === "object") {
    answerKeyJson = JSON.stringify(input.answerKey);
  }

  const kind: ExamKind = EXAM_KINDS.includes(input.kind as ExamKind)
    ? (input.kind as ExamKind)
    : "public";
  const courseIds = Array.isArray(input.courseIds)
    ? Array.from(new Set(input.courseIds.map(String).map((value) => value.trim()).filter(Boolean)))
    : [];
  if (kind === "enrolled" && courseIds.length === 0) {
    throw new Error("Assign at least one course to an enrolled exam.");
  }
  const chapterId = asString(input.chapterId) || null;
  const categoryId = asString(input.categoryId) || null;
  // Per-exam marking settings (Admin → Public Exam Control).
  const negativeEnabled = input.negativeEnabled === true;
  const negativePerWrongRaw = Number(input.negativePerWrong);
  const negativePerWrong =
    Number.isFinite(negativePerWrongRaw) && negativePerWrongRaw > 0
      ? Math.min(99, negativePerWrongRaw)
      : 0.25;
  const secondTimerEnabled = input.secondTimerEnabled === true;
  const secondTimerDeductionRaw = Number(input.secondTimerDeduction);
  const secondTimerDeduction =
    Number.isFinite(secondTimerDeductionRaw) && secondTimerDeductionRaw > 0
      ? Math.min(9999, secondTimerDeductionRaw)
      : 5;
  const featured = input.featured === true;
  // Per-exam type (public/course) — access-control layer.
  const examType: ExamType = input.examType === "course" ? "course" : "public";
  // Soft-disable flag.
  const active = input.active !== false;
  // Per-exam attempt limit (0 = use global default).
  const attemptLimit = Math.max(0, Number(input.attemptLimit) || 0);
  // Keep the admin's explicit order; new exams without one go to the end.
  let sortOrder = Math.max(0, Number(input.sortOrder) || 0);
  if (!sortOrder && !id) {
    const maxRows = await query<{ m: string | number | null }[]>(
      `SELECT MAX(sort_order) AS m FROM exams`,
    );
    sortOrder = toNumber(maxRows[0]?.m ?? null) + 1;
  }

  const existing = await query<{ id: string }[]>(
    `SELECT id FROM exams WHERE id = ? LIMIT 1`,
    [id],
  );
  const isNew = existing.length === 0;
  await exec(
    `INSERT INTO exams (${EXAM_COLUMNS}, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
       banner_url = VALUES(banner_url),
       kind = VALUES(kind), type = VALUES(type), batch_id = VALUES(batch_id),
       subject = VALUES(subject), chapter_id = VALUES(chapter_id), sort_order = VALUES(sort_order),
       category_id = VALUES(category_id),
       course_type = VALUES(course_type),
       duration_minutes = VALUES(duration_minutes),
       total_marks = VALUES(total_marks), negative_marks = VALUES(negative_marks),
       negative_enabled = VALUES(negative_enabled),
       negative_per_wrong = VALUES(negative_per_wrong),
       second_timer_enabled = VALUES(second_timer_enabled),
       second_timer_deduction = VALUES(second_timer_deduction),
       attempt_limit = VALUES(attempt_limit),
       question_count = VALUES(question_count), status = VALUES(status),
       active = VALUES(active),
       featured = VALUES(featured),
       scheduled_at = VALUES(scheduled_at), ends_at = VALUES(ends_at),
       answer_key = VALUES(answer_key), created_by = VALUES(created_by)`,
    [
      id,
      title,
      asString(input.description) || null,
      asString(input.bannerUrl) || null,
      kind,
      examType,
      asString(input.batchId),
      asString(input.subject),
      chapterId,
      sortOrder,
      categoryId,
      input.courseType === "Admission" ? "Admission" : "Academic",
      Math.max(1, Number(input.durationMinutes) || 30),
      Number(totals[0]?.marks ?? input.totalMarks) || 0,
      Math.max(0, Number(input.negativeMarks) || 0),
      negativeEnabled ? 1 : 0,
      negativePerWrong,
      secondTimerEnabled ? 1 : 0,
      secondTimerDeduction,
      attemptLimit,
      totals[0]?.count ?? 0,
      ["draft", "published", "closed"].includes(String(input.status))
        ? String(input.status)
        : "draft",
      active ? 1 : 0,
      featured ? 1 : 0,
      scheduledAt,
      endsAt,
      answerKeyJson,
      adminUid,
    ],
  );

  // New public exams start with MediSpark's standard rule set — fully
  // editable/deletable afterwards from Public Exam Control → Rules.
  if (isNew) {
    try {
      await seedDefaultExamRules(id);
    } catch {
      // Best effort — rules can still be added manually.
    }
  }

  // Keep course assignments in sync (enrolled exams).
  await exec(`DELETE FROM exam_courses WHERE exam_id = ?`, [id]);
  for (const courseId of courseIds) {
    await exec(
      `INSERT IGNORE INTO exam_courses (exam_id, course_id) VALUES (?, ?)`,
      [id, courseId],
    );
  }

  const rows = await query<ExamRow[]>(`SELECT ${EXAM_COLUMNS} FROM exams WHERE id = ? LIMIT 1`, [id]);
  if (!rows[0]) throw new Error("Failed to save the exam.");
  const exam = rowToExam(rows[0]);
  exam.courseIds = courseIds;
  exam.chapterId = chapterId;
  return exam;
}

/** Change display order of exams from an ordered id list. */
export async function reorderExams(orderedIds: string[]): Promise<void> {
  await ensureTables();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec(`UPDATE exams SET sort_order = ? WHERE id = ?`, [
      index + 1,
      orderedIds[index],
    ]);
  }
}

export async function deleteExam(id: string): Promise<void> {
  await ensureTables();
  await exec(`DELETE FROM exam_questions WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exam_enrollments WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exam_results WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exam_courses WHERE exam_id = ?`, [id]);
  await exec(`DELETE FROM exam_rules WHERE exam_id = ?`, [id]);
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
  const values = [
    examId,
    asString(input.subject),
    text,
    JSON.stringify(options),
    correctIndex,
    asString(input.explanation) || null,
    Math.max(0.5, Number(input.marks) || 1),
    input.isActive === false ? 0 : 1,
  ];

  const existingId = Number(input.id);
  if (Number.isInteger(existingId) && existingId > 0) {
    // Update an existing question (possibly moving it between exams/bank).
    const current = await query<{ exam_id: string | null }[]>(
      `SELECT exam_id FROM exam_questions WHERE id = ? LIMIT 1`,
      [existingId],
    );
    if (!current[0]) throw new Error("Question not found.");
    await exec(
      `UPDATE exam_questions SET exam_id = ?, bank_subject = ?, question = ?,
         options = ?, correct_index = ?, explanation = ?, marks = ?, is_active = ?
       WHERE id = ?`,
      [...values, existingId],
    );
    await recomputeExamTotals(current[0].exam_id);
    await recomputeExamTotals(examId);
    return fetchQuestions({ examId: examId ?? "bank", subject: asString(input.subject) });
  }

  await exec(
    `INSERT INTO exam_questions (exam_id, bank_subject, question, options, correct_index, explanation, marks, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    values,
  );
  await recomputeExamTotals(examId);
  return fetchQuestions({ examId: examId ?? "bank", subject: asString(input.subject) });
}

/** Attach a copy of a reusable bank question to an exam. */
export async function attachBankQuestion(
  questionId: number,
  examId: string,
): Promise<ExamQuestion[]> {
  await ensureTables();
  if (!/^[a-z0-9-]{2,64}$/.test(examId)) {
    throw new Error("Invalid exam id.");
  }
  const source = await query<
    { bank_subject: string; question: string; options: string; correct_index: number; explanation: string | null; marks: string | number }[]
  >(
    `SELECT bank_subject, question, options, correct_index, explanation, marks
     FROM exam_questions WHERE id = ? AND exam_id IS NULL LIMIT 1`,
    [questionId],
  );
  const src = source[0];
  if (!src) throw new Error("Bank question not found.");
  await exec(
    `INSERT INTO exam_questions (exam_id, bank_subject, question, options, correct_index, explanation, marks, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [examId, src.bank_subject, src.question, src.options, src.correct_index, src.explanation, Math.max(0.5, Number(src.marks) || 1)],
  );
  await recomputeExamTotals(examId);
  return fetchQuestions({ examId });
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
  if (ensureResultTablesReady) return;
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
  // Databases created before the richer result storage need these columns.
  try {
    await ensureColumn("exam_results", "time_taken_seconds", "INT NULL");
    await ensureColumn("exam_results", "merit_position", "INT NULL");
    await ensureColumn("exam_results", "details", "JSON NULL");
    await ensureColumn("exam_results", "negative_deduction", "`negative_deduction` DECIMAL(6,2) NOT NULL DEFAULT 0");
    await ensureColumn("exam_results", "timer_penalty", "`timer_penalty` DECIMAL(6,2) NOT NULL DEFAULT 0");
    await ensureColumn("exam_results", "is_second_timer", "`is_second_timer` TINYINT(1) NOT NULL DEFAULT 0");
  } catch {
    // Best effort — columns may already exist.
  }
  ensureResultTablesReady = true;
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
  merit_position: number | null;
  time_taken_seconds: number | null;
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
      meritPosition: row.merit_position ?? null,
      timeTakenSeconds: row.time_taken_seconds ?? null,
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
  if (ensureSettingsTableReady) return;
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
  ensureSettingsTableReady = true;
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

/** Quick publish/unpublish/close toggle from the admin exam list. */
export async function setExamStatus(
  id: string,
  status: ExamStatus,
): Promise<void> {
  await ensureTables();
  if (!["draft", "published", "closed"].includes(status)) {
    throw new Error("Invalid exam status.");
  }
  const result = await exec(`UPDATE exams SET status = ? WHERE id = ?`, [status, id]);
  if (!result.affectedRows) throw new Error("Exam not found.");
}

/**
 * Whether a student may take an enrolled exam — true when they have an
 * active (or completed) enrollment in at least one assigned course.
 */
export async function hasEnrolledExamAccess(
  examId: string,
  uid: string,
): Promise<boolean> {
  try {
    await ensureTables();
    const rows = await query<{ ok: number }[]>(
      `SELECT 1 AS ok FROM exam_courses ec
       JOIN enrollments e ON e.course_id = ec.course_id AND e.student_uid = ?
       WHERE ec.exam_id = ? AND e.enrollment_status IN ('active','completed')
       LIMIT 1`,
      [uid, examId],
    );
    return rows.length > 0;
  } catch {
    // Fail closed — never leak gated exams on DB errors.
    return false;
  }
}

/**
 * Public exams highlighted as banner slides on the homepage. The exam itself
 * is the source of truth — toggling Featured in the Admin Panel makes the
 * slide appear/disappear automatically (no manual banner records).
 */
export async function fetchFeaturedPublicExams(): Promise<Exam[]> {
  try {
    await ensureTables();
    const rows = await query<ExamRow[]>(
      `SELECT ${EXAM_COLUMNS} FROM exams
       WHERE featured = 1 AND status = 'published' AND kind = 'public'
       ORDER BY sort_order ASC, created_at DESC`,
    );
    return rows.map(rowToExam);
  } catch {
    return [];
  }
}

/**
 * Published public exams for the Main Website, optionally scoped to ONE
 * Public Exam Control category (SQL-level WHERE category_id = ?). This is
 * the shared Admin Panel → Database → Main Website relationship: an exam
 * created under a category in Public Exam Control appears under that same
 * category on the website automatically.
 */
export async function fetchPublishedPublicExams(
  categoryId?: string,
): Promise<Exam[]> {
  try {
    await ensureTables();
    const params: unknown[] = [];
    let where = `kind = 'public' AND status <> 'draft'`;
    if (categoryId && categoryId.trim()) {
      where += ` AND category_id = ?`;
      params.push(categoryId.trim());
    }
    const rows = await query<ExamRow[]>(
      `SELECT ${EXAM_COLUMNS} FROM exams
       WHERE ${where}
       ORDER BY sort_order ASC, created_at DESC`,
      params,
    );
    return rows.map(rowToExam);
  } catch {
    return [];
  }
}
