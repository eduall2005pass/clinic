import { query } from "@/lib/mysql";

// Student Exam Results — real data from the existing `exam_results` table.
// Grouping: an exam belongs to a course through
// exams.chapter_id → course_chapters → course_subject_assignments → course.
// Exams without that chain (public exams) land in a "General" group.
// Ranking = `merit_position`, already computed by the existing exam ranking
// rules (score desc → faster time → earlier submission).

export type StudentExamResultRow = {
  examId: string;
  examName: string;
  totalMarks: number;
  obtainedMarks: number;
  highestMark: number | null;
  meritPosition: number | null;
  timeTakenSeconds: number | null;
  submittedAt: string;
};

export type StudentExamResultGroup = {
  /** null slug = exams not attached to any course (public/general). */
  courseSlug: string | null;
  courseName: string;
  totalMarks: number;
  obtainedMarks: number;
  results: StudentExamResultRow[];
};

type ResultRow = {
  exam_id: string;
  title: string;
  score: string | number;
  total_marks: string | number;
  merit_position: number | null;
  time_taken_seconds: number | null;
  submitted_at: Date | string;
  course_slug: string | null;
  course_name: string | null;
};

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** All exam attempts of one student, grouped course-wise. */
export async function getStudentExamResultGroups(
  uid: string,
): Promise<StudentExamResultGroup[]> {
  try {
    const rows = await query<ResultRow[]>(
      `SELECT r.exam_id, ex.title, r.score, r.total_marks, r.merit_position,
              r.time_taken_seconds, r.submitted_at,
              cc.slug AS course_slug, cc.name AS course_name
         FROM exam_results r
         JOIN exams ex ON ex.id = r.exam_id
         LEFT JOIN course_chapters ch ON ch.id = ex.chapter_id
         LEFT JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
         LEFT JOIN catalog_courses cc ON cc.slug = a.course_slug
        WHERE r.student_uid = ?
        ORDER BY r.submitted_at DESC`,
      [uid],
    );
    if (rows.length === 0) return [];

    // Best score per exam across ALL students — for the Highest Mark column.
    const examIds = [...new Set(rows.map((row) => row.exam_id))];
    const bestRows = await query<{ exam_id: string; best: string | number }[]>(
      `SELECT exam_id, MAX(score) AS best FROM exam_results
        WHERE exam_id IN (${examIds.map(() => "?").join(",")})
        GROUP BY exam_id`,
      examIds,
    );
    const bestByExam = new Map(
      bestRows.map((row) => [row.exam_id, num(row.best)]),
    );

    const groups = new Map<string, StudentExamResultGroup>();
    for (const row of rows) {
      const key = row.course_slug ?? "__general";
      let group = groups.get(key);
      if (!group) {
        group = {
          courseSlug: row.course_slug,
          courseName: row.course_name ?? "Other Exams",
          totalMarks: 0,
          obtainedMarks: 0,
          results: [],
        };
        groups.set(key, group);
      }
      const obtained = num(row.score);
      group.results.push({
        examId: row.exam_id,
        examName: row.title,
        totalMarks: num(row.total_marks),
        obtainedMarks: obtained,
        highestMark: bestByExam.get(row.exam_id) ?? null,
        meritPosition:
          row.merit_position === null || row.merit_position === undefined
            ? null
            : Number(row.merit_position),
        timeTakenSeconds:
          row.time_taken_seconds === null || row.time_taken_seconds === undefined
            ? null
            : Number(row.time_taken_seconds),
        submittedAt: toIso(row.submitted_at),
      });
      group.totalMarks += num(row.total_marks);
      group.obtainedMarks += obtained;
    }

    return [...groups.values()];
  } catch {
    return [];
  }
}
