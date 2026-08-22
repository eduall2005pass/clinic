import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { submitExamAttempt } from "@/lib/exam-taking";

export const dynamic = "force-dynamic";

type SubmitBody = { answers?: Record<string, unknown> };

/** POST /api/exams/[id]/submit — grade answers and store the result. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubmitBody | null;
  if (!body || typeof body.answers !== "object" || body.answers === null) {
    return NextResponse.json({ error: "Missing answers." }, { status: 400 });
  }

  // Keep only numeric selections.
  const answers: Record<string, number> = {};
  for (const [key, value] of Object.entries(body.answers)) {
    if (/^\d+$/.test(key) && Number.isInteger(value)) {
      answers[key] = value as number;
    }
  }

  const { id } = await context.params;
  const outcome = await submitExamAttempt(
    id,
    user.uid,
    user.name || user.email || "Student",
    answers,
  );
  if (!outcome) {
    return NextResponse.json(
      { error: "Exam not found or not available." },
      { status: 404 },
    );
  }

  return NextResponse.json(outcome);
}
