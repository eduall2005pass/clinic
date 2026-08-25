import { randomBytes } from "node:crypto";
import { query, exec, isMysqlConfigured } from "@/lib/mysql";
import type { QaQuestion, QaSubject } from "@/lib/qa";

/**
 * MySQL-backed Q&A store. Subjects and questions live in the qa_subjects /
 * qa_questions tables (src/sql/qa-migration.sql). The static lists in
 * src/lib/qa.ts are only used to seed an empty installation.
 */

const SEED_SUBJECTS: QaSubject[] = [
  { id: "biology", name: "Biology", order: 1 },
  { id: "chemistry", name: "Chemistry", order: 2 },
  { id: "physics", name: "Physics", order: 3 },
  { id: "english", name: "English", order: 4 },
  { id: "gk", name: "GK", order: 5 },
];

type SubjectRow = {
  subject_id: string;
  name: string;
  sort_order: number;
  is_active: number;
};

type QuestionRow = {
  question_id: string;
  subject_id: string;
  student_uid: string | null;
  student_name: string;
  text: string;
  answer_text: string | null;
  answered_by: string | null;
  answered_at: Date | string | null;
  status: string;
  created_at: Date | string;
};

function newQuestionId(): string {
  return `q-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function parseTime(value: Date | string | null): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

async function ensureTables(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS qa_subjects (
      subject_id VARCHAR(64) NOT NULL,
      name VARCHAR(191) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_qa_subjects_pk (subject_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await exec(
    `CREATE TABLE IF NOT EXISTS qa_questions (
      question_id VARCHAR(40) NOT NULL,
      subject_id VARCHAR(64) NOT NULL,
      student_uid VARCHAR(128) NULL,
      student_name VARCHAR(191) NOT NULL DEFAULT 'Student',
      text TEXT NOT NULL,
      answer_text TEXT NULL,
      answered_by VARCHAR(191) NULL,
      answered_at DATETIME NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'unanswered',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_qa_questions_pk (question_id),
      KEY idx_qa_questions_subject (subject_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

/** Seed the default subjects once when the table is empty. */
export async function ensureQaSeed(): Promise<void> {
  await ensureTables();
  const rows = await query<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM qa_subjects",
  );
  if ((rows[0]?.total ?? 0) > 0) return;
  for (const subject of SEED_SUBJECTS) {
    await exec(
      "INSERT IGNORE INTO qa_subjects (subject_id, name, sort_order) VALUES (?, ?, ?)",
      [subject.id, subject.name, subject.order],
    );
  }
}

export async function fetchQaSubjects(
  activeOnly = true,
): Promise<QaSubject[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureQaSeed();
    const rows = await query<SubjectRow[]>(
      `SELECT subject_id, name, sort_order, is_active FROM qa_subjects
       ${activeOnly ? "WHERE is_active = 1" : ""}
       ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map((row) => ({
      id: row.subject_id,
      name: row.name,
      order: Number(row.sort_order) || 0,
    }));
  } catch {
    return [];
  }
}

export async function saveQaSubject(
  id: string,
  name: string,
  sortOrder: number,
): Promise<void> {
  await ensureTables();
  await exec(
    `INSERT INTO qa_subjects (subject_id, name, sort_order, is_active)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)`,
    [id, name, sortOrder],
  );
}

export async function setQaSubjectActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await ensureTables();
  await exec("UPDATE qa_subjects SET is_active = ? WHERE subject_id = ?", [
    isActive ? 1 : 0,
    id,
  ]);
}

export async function deleteQaSubject(id: string): Promise<boolean> {
  await ensureTables();
  const result = await exec(
    "DELETE FROM qa_questions WHERE subject_id = ?",
    [id],
  );
  const removed = await exec(
    "DELETE FROM qa_subjects WHERE subject_id = ?",
    [id],
  );
  return (removed.affectedRows ?? 0) > 0 || (result.affectedRows ?? 0) > 0;
}

function formatQaDate(ms: number | null): string {
  if (ms === null) return "";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapQuestion(row: QuestionRow): QaQuestion {
  const status: QaQuestion["status"] =
    row.status === "answered" || row.answer_text !== null
      ? "answered"
      : "unanswered";
  const createdAtMs = parseTime(row.created_at);
  return {
    id: row.question_id,
    subjectId: row.subject_id,
    studentName: row.student_name,
    studentAvatar: "/avatars/student.svg",
    text: row.text,
    hasPicture: false,
    hasAudio: false,
    createdAt: formatQaDate(createdAtMs),
    status,
    answer:
      status === "answered"
        ? {
            id: `${row.question_id}-answer`,
            teacherName: row.answered_by ?? "Teacher",
            content: row.answer_text ?? "",
            answeredAt: formatQaDate(parseTime(row.answered_at)),
          }
        : undefined,
  };
}

export async function fetchQaQuestions(options: {
  subjectId?: string;
} = {}): Promise<QaQuestion[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureTables();
    const params: unknown[] = [];
    let where = "";
    if (options.subjectId && options.subjectId.trim().length > 0) {
      where = "WHERE subject_id = ?";
      params.push(options.subjectId.trim());
    }
    const rows = await query<QuestionRow[]>(
      `SELECT question_id, subject_id, student_uid, student_name, text,
              answer_text, answered_by, answered_at, status, created_at
       FROM qa_questions ${where} ORDER BY created_at DESC LIMIT 500`,
      params,
    );
    return rows.map(mapQuestion);
  } catch {
    return [];
  }
}

export async function insertQaQuestion(input: {
  subjectId: string;
  studentUid: string;
  studentName: string;
  text: string;
}): Promise<QaQuestion | null> {
  await ensureTables();
  const id = newQuestionId();
  try {
    await exec(
      `INSERT INTO qa_questions
        (question_id, subject_id, student_uid, student_name, text, status)
       VALUES (?, ?, ?, ?, ?, 'unanswered')`,
      [id, input.subjectId, input.studentUid, input.studentName, input.text],
    );
    const rows = await fetchQaQuestions({ subjectId: input.subjectId });
    return rows.find((question) => question.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function answerQaQuestion(
  questionId: string,
  content: string,
  teacherName: string,
): Promise<boolean> {
  await ensureTables();
  const result = await exec(
    `UPDATE qa_questions
     SET answer_text = ?, answered_by = ?, answered_at = NOW(), status = 'answered'
     WHERE question_id = ?`,
    [content, teacherName, questionId],
  );
  return result.affectedRows > 0;
}

export async function deleteQaQuestion(questionId: string): Promise<boolean> {
  await ensureTables();
  const result = await exec(
    "DELETE FROM qa_questions WHERE question_id = ?",
    [questionId],
  );
  return result.affectedRows > 0;
}
