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
  const exam = await fetchExamPageById(id);
  if (!exam) {
    return NextResponse.json(
      { error: "Exam not found or not available." },
      { status: 404 },
    );
  }
  const stored = await fetchExamRules(id);
  const rules = stored.length > 0 ? stored : buildDefaultExamRules(id);
  return NextResponse.json(
    { examId: id, examName: exam.name, rules, customizable: stored.length > 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
