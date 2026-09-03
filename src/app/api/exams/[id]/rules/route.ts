import { NextRequest, NextResponse } from "next/server";
import { buildDefaultExamRules, fetchExamRules } from "@/lib/exam-rules";
import { fetchExamPageById } from "@/lib/public-exams-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/[id]/rules — the rule set of ONE specific exam, loaded
 * from MySQL (Admin-managed). Falls back to MediSpark's standard rules
 * when the admin has not customised them yet.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  // Use direct ID lookup — same unique Exam ID throughout the flow.
  const exam = await fetchExamPageById(id);
  if (!exam) {
    // Distinguish missing ID vs draft to avoid false "No exam found" on status mismatches
    const { fetchExamById } = await import("@/lib/exams-admin");
    const direct = await fetchExamById(id);
    if (!direct) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }
    if (direct.status === "draft") {
      return NextResponse.json({ error: "This exam is not published yet." }, { status: 403 });
    }
    return NextResponse.json({ error: "Exam not found or not available." }, { status: 404 });
  }
  const stored = await fetchExamRules(id);
  const rules = stored.length > 0 ? stored : buildDefaultExamRules(id);
  return NextResponse.json(
    { examId: id, examName: exam.name, rules, customizable: stored.length > 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
