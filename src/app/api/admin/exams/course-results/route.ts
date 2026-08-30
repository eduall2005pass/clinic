import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { query, isMysqlConfigured } from "@/lib/mysql";

export const dynamic = "force-dynamic";

type Row = {
  exam_id: string;
  title: string;
  total_marks: number;
  result_id: number | null;
  student_uid: string | null;
  student_name: string | null;
  score: number | null;
};

/**
 * GET /api/admin/exams/course-results?slug=… — result sheet for every exam
 * assigned to a course: Exam Name · Total Mark · Obtained · Highest · Merit.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "manageResults"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!slug || !isMysqlConfigured) {
    return NextResponse.json({ exams: [] });
  }
  try {
    const rows = await query<Row[]>(
      `SELECT ex.id AS exam_id, ex.title, ex.total_marks,
              er.id AS result_id, er.student_uid, er.student_name, er.score
         FROM exam_courses ec
         JOIN exams ex ON ex.id = ec.exam_id
         LEFT JOIN exam_results er ON er.exam_id = ex.id
        WHERE ec.course_id = ?
        ORDER BY ex.title ASC, er.score DESC`,
      [slug],
    );

    // Group per exam; compute Highest Mark and Merit Position dynamically.
    const exams = new Map<
      string,
      {
        examId: string;
        title: string;
        totalMarks: number;
        highestMark: number;
        results: Array<{
          position: number;
          studentUid: string;
          studentName: string;
          obtained: number;
        }>;
      }
    >();
    for (const row of rows) {
      let exam = exams.get(row.exam_id);
      if (!exam) {
        exam = {
          examId: row.exam_id,
          title: row.title,
          totalMarks: Number(row.total_marks) || 0,
          highestMark: 0,
          results: [],
        };
        exams.set(row.exam_id, exam);
      }
      if (row.result_id !== null && row.student_uid) {
        exam.results.push({
          position: 0,
          studentUid: row.student_uid,
          studentName: row.student_name ?? "Student",
          obtained: Number(row.score) || 0,
        });
      }
    }
    for (const exam of exams.values()) {
      exam.results.sort((a, b) => b.obtained - a.obtained);
      exam.highestMark = exam.results[0]?.obtained ?? 0;
      exam.results.forEach((result, index) => {
        result.position = index + 1;
      });
    }

    return NextResponse.json(
      { exams: [...exams.values()] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load the course result sheet." },
      { status: 500 },
    );
  }
}
