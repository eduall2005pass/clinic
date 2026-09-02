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

  // Validate question belongs to this exam (free-order: any question may be
  // answered at any time, any skip/jump is allowed).
  try {
    const questionRows = await query<{ id: number | string }[]>(
      `SELECT id FROM exam_questions WHERE exam_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC`,
      [id],
    );
    const orderedIds = questionRows.map((r) => Number(r.id));
    if (!orderedIds.includes(body.questionId)) {
      return NextResponse.json(
        { error: "Invalid question for this exam." },
        { status: 400 },
      );
    }
  } catch {
    // On transient DB errors fall through — saveExamAnswer remains authoritative.
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
