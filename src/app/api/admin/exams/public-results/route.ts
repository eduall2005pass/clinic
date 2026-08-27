import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchPublicExamRankedResults,
  fetchPublicExamResultHeader,
  fetchPublicExamResultStats,
  fetchPublicExamResultSummaries,
  fetchPublicExamStudentResult,
} from "@/lib/public-exam-results";

export const dynamic = "force-dynamic";

/**
 * Admin → Result Control → Public Exam Result.
 *   GET                                   → all conducted public exams (summary)
 *   GET ?examId=<id>                      → exam header stats + ranked participants
 *   GET ?examId=<id>&studentUid=<uid>     → ONE student's full result + answer sheet
 * Strictly exam-specific: every query is scoped by exam_id (and student_id).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "manageResults"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const examId = request.nextUrl.searchParams.get("examId")?.trim() ?? "";
  const studentUid =
    request.nextUrl.searchParams.get("studentUid")?.trim() ?? "";

  try {
    if (!examId) {
      return NextResponse.json(
        { exams: await fetchPublicExamResultSummaries() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (studentUid) {
      const result = await fetchPublicExamStudentResult(examId, studentUid);
      if (!result) {
        return NextResponse.json(
          { error: "No result found for this student in this exam." },
          { status: 404 },
        );
      }
      await logAdminAction(
        admin,
        "public_exam.result.view",
        `exam=${examId} student=${studentUid}`,
        request,
      );
      return NextResponse.json({ result }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const [header, stats, results] = await Promise.all([
      fetchPublicExamResultHeader(examId),
      fetchPublicExamResultStats(examId),
      fetchPublicExamRankedResults(examId),
    ]);
    if (!header) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }
    return NextResponse.json(
      { exam: header, stats, results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
