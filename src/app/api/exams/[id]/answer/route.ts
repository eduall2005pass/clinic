import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { saveExamAnswer } from "@/lib/exam-taking";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

type AnswerBody = {
  token?: unknown;
  questionId?: unknown;
  optionIndex?: unknown;
};

/**
 * POST /api/exams/[id]/answer — store a single selection.
 * Server-enforced: the first selection for a question wins; changes are
 * rejected. If another device took over the session, the terminated
 * session's graded outcome is returned so this tab can show it.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as AnswerBody | null;
  if (
    !body ||
    typeof body.token !== "string" ||
    !body.token ||
    typeof body.questionId !== "number" ||
    typeof body.optionIndex !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing answer details." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  // Sequential guard: ensure questionId is the next expected in order.
  // Fetch ordered active question IDs, find index, and reject if the
  // student is jumping more than 1 ahead of current progress or trying
  // to answer a previous skipped question (no going back).
  try {
    const questionRows = await query<{ id: number | string }[]>(
      `SELECT id FROM exam_questions WHERE exam_id = ? AND is_active = 1 ORDER BY id ASC`,
      [id],
    );
    const orderedIds = questionRows.map((r) => Number(r.id));
    const idx = orderedIds.indexOf(body.questionId);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Invalid question for this exam." },
        { status: 400 },
      );
    }
    let answeredRows: { question_id: number | string }[] = [];
    try {
      answeredRows = await query<{ question_id: number | string }[]>(
        `SELECT question_id FROM exam_attempt_answers WHERE exam_id = ? AND student_uid = ?`,
        [id, user.uid],
      );
    } catch {
      answeredRows = [];
    }
    const answeredSet = new Set(answeredRows.map((r) => Number(r.question_id)));
    if (!answeredSet.has(body.questionId)) {
      const answeredCount = answeredRows.length;
      if (idx > answeredCount + 1) {
        return NextResponse.json(
          { error: "Questions must be answered in sequence." },
          { status: 400 },
        );
      }
      if (idx < answeredCount) {
        return NextResponse.json(
          { error: "Questions must be answered in sequence." },
          { status: 400 },
        );
      }
    }
  } catch {
    // On DB errors for the verification queries, fall through to saveExamAnswer
    // so the request is not blocked by a transient verification failure.
  }

  const result = await saveExamAnswer(
    id,
    user.uid,
    user.name || user.email || "Student",
    body.token,
    body.questionId,
    body.optionIndex,
  );
  if (!result.accepted && !result.terminated) {
    return NextResponse.json(
      { error: "This answer is locked — you can select an answer only once." },
      { status: 409 },
    );
  }
  return NextResponse.json(result);
}
