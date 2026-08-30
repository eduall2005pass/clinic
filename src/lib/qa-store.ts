import { randomBytes } from "node:crypto";
import { query, exec, isMysqlConfigured } from "@/lib/mysql";
import type {
  QaAskOptions,
  QaQuestion,
  QaSubject,
} from "@/lib/qa";
import { fetchActiveCourseCategories, type CourseCategory } from "@/lib/course-categories-store";

let ensureQaSeedReady = false;
let ensureQaColumnsReady = false;
/**
 * MySQL-backed Q&A store. Questions live in qa_questions and every question
 * carries its full course context (category_id + course_id + subject_id).
 * Subjects shown in Q&A come from the Course Control course_subjects assigned
 * to courses; the legacy qa_subjects table only survives as a fallback for
 * old seeded rows that already have questions.
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
  category_id: string | null;
  course_id: string | null;
  image_url: string | null;
  category_name: string | null;
  course_name: string | null;
  subject_name: string | null;
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
      category_id VARCHAR(191) NULL,
      course_id VARCHAR(191) NULL,
      image_url VARCHAR(1024) NULL,
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
  await ensureQaColumns();
}

/** Add the context columns to pre-existing qa_questions tables. */
async function ensureQaColumns(): Promise<void> {
  if (ensureQaColumnsReady) return;
  const columns = [
    { name: "category_id", ddl: "ADD COLUMN category_id VARCHAR(191) NULL AFTER subject_id" },
    { name: "course_id", ddl: "ADD COLUMN course_id VARCHAR(191) NULL AFTER category_id" },
    { name: "image_url", ddl: "ADD COLUMN image_url VARCHAR(1024) NULL AFTER course_id" },
  ];
  for (const column of columns) {
    const rows = await query<{ found: number }[]>(
      `SELECT 1 AS found FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qa_questions'
          AND COLUMN_NAME = ? LIMIT 1`,
      [column.name],
    );
    if (rows.length === 0) {
      await exec(`ALTER TABLE qa_questions ${column.ddl}`);
    }
  }
  // Legacy installs may have a FK qa_questions.subject_id → qa_subjects.
  // Questions now reference Course Control subjects, so drop that FK when it
  // exists (works on both MySQL and MariaDB).
  try {
    const fks = await query<{ CONSTRAINT_NAME: string }[]>(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qa_questions'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    for (const fk of fks) {
      await exec(
        `ALTER TABLE qa_questions DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
      );
    }
  } catch {
    // Best-effort — insertions still work when no FK exists.
  }
  ensureQaColumnsReady = true;
}

/** Seed the default subjects once when the table is empty. */
export async function ensureQaSeed(): Promise<void> {
  if (ensureQaSeedReady) return;
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
  ensureQaSeedReady = true;
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
    categoryId: row.category_id,
    courseId: row.course_id,
    categoryName: row.category_name,
    courseName: row.course_name,
    subjectName: row.subject_name,
    imageUrl: row.image_url,
    studentName: row.student_name,
    studentAvatar: "/avatars/student.svg",
    text: row.text,
    hasPicture: Boolean(row.image_url),
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
  /** Backend-enforced tab filter on the existing `status` column. */
  status?: "unanswered" | "answered";
} = {}): Promise<QaQuestion[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureTables();
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (options.subjectId && options.subjectId.trim().length > 0) {
      clauses.push("q.subject_id = ?");
      params.push(options.subjectId.trim());
    }
    if (
      options.status === "unanswered" ||
      options.status === "answered"
    ) {
      clauses.push("q.status = ?");
      params.push(options.status);
    }
    const where =
      clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await query<QuestionRow[]>(
      `SELECT q.question_id, q.subject_id, q.category_id, q.course_id,
              q.image_url, q.student_uid, q.student_name, q.text,
              q.answer_text, q.answered_by, q.answered_at, q.status, q.created_at,
              cat.name AS category_name, c.name AS course_name,
              COALESCE(cs.name, qs.name) AS subject_name
         FROM qa_questions q
         LEFT JOIN course_categories cat ON cat.id = q.category_id
         LEFT JOIN catalog_courses c ON c.slug = q.course_id
         LEFT JOIN course_subjects cs ON cs.id = q.subject_id
         LEFT JOIN qa_subjects qs ON qs.subject_id = q.subject_id
         ${where} ORDER BY q.created_at DESC LIMIT 500`,
      params,
    );
    return rows.map(mapQuestion);
  } catch {
    return [];
  }
}

export async function insertQaQuestion(input: {
  subjectId: string;
  categoryId: string;
  courseId: string;
  studentUid: string;
  studentName: string;
  text: string;
  imageUrl?: string | null;
}): Promise<QaQuestion | null> {
  await ensureTables();
  const id = newQuestionId();
  try {
    await exec(
      `INSERT INTO qa_questions
        (question_id, subject_id, category_id, course_id, image_url,
         student_uid, student_name, text, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unanswered')`,
      [
        id,
        input.subjectId,
        input.categoryId,
        input.courseId,
        input.imageUrl ?? null,
        input.studentUid,
        input.studentName,
        input.text,
      ],
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

// ── Course-context helpers (Course Control + enrollment driven) ──────────

/** Normalize a category label so "HSC Academic Courses" ≈ "HSC Academic". */
function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bcourses\b/g, "")
    .trim();
}

/** Match a catalog course's category label to a Course Control category id. */
export function matchCategoryId(
  categories: CourseCategory[],
  label: string | null,
): string | null {
  if (!label) return null;
  const norm = normalizeLabel(label);
  if (!norm) return null;
  return (
    categories.find((cat) => normalizeLabel(cat.name) === norm)?.id ??
    categories.find((cat) => norm === normalizeLabel(cat.slug))?.id ??
    categories.find((cat) => norm.includes(normalizeLabel(cat.slug)))?.id ??
    categories.find((cat) => {
      const catNorm = normalizeLabel(cat.name);
      return catNorm.length > 0 && norm.includes(catNorm);
    })?.id ??
    null
  );
}

/**
 * Subjects for the Q&A browse tabs. Primary source is the Course Control
 * subjects actually assigned to courses; legacy qa_subjects rows that still
 * have questions are merged in so old data stays visible.
 */
export async function fetchQaBrowseSubjects(): Promise<QaSubject[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureTables();
    await ensureQaSeed();
    const rows = await query<{ id: string; name: string; ord: number }[]>(
      `SELECT ids.id, MIN(ids.name) AS name, MIN(ids.ord) AS ord
         FROM (
           SELECT cs.id AS id, cs.name AS name, cs.sort_order AS ord
             FROM course_subjects cs
             JOIN course_subject_assignments a ON a.subject_id = cs.id
            WHERE cs.is_active = 1
            UNION
           SELECT qs.subject_id AS id, qs.name AS name, qs.sort_order AS ord
             FROM qa_subjects qs
            WHERE qs.is_active = 1
         ) AS ids
        GROUP BY ids.id
        ORDER BY ord ASC, name ASC`,
    );
    // Fallback to seed when DB has no rows yet (e.g., fresh install with no course assignments).
    // Guarantees the 5 core Q&A subjects are always present; Guideline is appended caller-side.
    if (rows.length === 0) {
      return SEED_SUBJECTS.map((s) => ({ id: s.id, name: s.name, order: s.order }));
    }
    // Ensure the canonical 5 are present even if course_subjects filtering hid them.
    // Deduplicate by id OR name (covers course_subjects that use UUIDs but same display name).
    const presentIds = new Set(rows.map((r) => r.id));
    const presentNames = new Set(rows.map((r) => r.name.toLowerCase().trim()));
    const missing = SEED_SUBJECTS.filter(
      (s) => !presentIds.has(s.id) && !presentNames.has(s.name.toLowerCase()),
    );
    const merged = [
      ...rows.map((row) => ({ id: row.id, name: row.name, ord: Number(row.ord) || 999 })),
      ...missing.map((s) => ({ id: s.id, name: s.name, ord: s.order })),
    ];
    merged.sort((a, b) => a.ord - b.ord || a.name.localeCompare(b.name));
    return merged.map((row, index) => ({
      id: row.id,
      name: row.name,
      order: index + 1,
    }));
  } catch {
    // On query failure, still return the seeded subjects so the UI never shows only Guideline.
    return SEED_SUBJECTS.map((s) => ({ id: s.id, name: s.name, order: s.order }));
  }
}

type AskOptionCourseRow = { slug: string; name: string; category: string | null };
type AskOptionSubjectRow = { course_slug: string; id: string; name: string };

/**
 * Everything the student Ask form needs, derived ONLY from real data:
 * active Course Control categories, the student's ACTIVE enrollments and
 * the subjects assigned to those enrolled courses.
 */
export async function fetchQaAskOptions(uid: string): Promise<QaAskOptions> {
  const empty: QaAskOptions = { categories: [], courses: [], subjects: [] };
  if (!isMysqlConfigured) return empty;
  try {
    await ensureTables();
    const categories = await fetchActiveCourseCategories();

    let courses: QaAskOptions["courses"] = [];
    try {
      const courseRows = await query<AskOptionCourseRow[]>(
        `SELECT c.slug, c.name, c.category
           FROM enrollments e
           JOIN catalog_courses c ON c.slug = e.course_id
          WHERE e.student_uid = ? AND e.enrollment_status = 'active'
          ORDER BY c.name ASC`,
        [uid],
      );
      courses = courseRows.map((row) => ({
        id: row.slug,
        name: row.name || row.slug,
        categoryId: matchCategoryId(categories, row.category),
      }));
    } catch {
      courses = [];
    }

    let subjects: QaAskOptions["subjects"] = [];
    const slugs = courses.map((course) => course.id);
    if (slugs.length > 0) {
      try {
        const subjectRows = await query<AskOptionSubjectRow[]>(
          `SELECT a.course_slug, s.id, s.name
             FROM course_subject_assignments a
             JOIN course_subjects s ON s.id = a.subject_id AND s.is_active = 1
            WHERE a.course_slug IN (${slugs.map(() => "?").join(",")})
            ORDER BY a.course_slug ASC, s.sort_order ASC, s.name ASC`,
          slugs,
        );
        subjects = subjectRows.map((row) => ({
          id: row.id,
          name: row.name,
          courseId: row.course_slug,
        }));
      } catch {
        subjects = [];
      }
    }

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      courses,
      subjects,
    };
  } catch {
    return empty;
  }
}
