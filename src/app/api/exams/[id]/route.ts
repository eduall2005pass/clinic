import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { getExamForTaking } from "@/lib/exam-taking";

export const dynamic = "force-dynamic";

/** GET /api/exams/[id] — exam meta + sanitized questions (no answers). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  // The attempt (timer + answer storage) begins only with ?start=1 — i.e.
  // after the student accepts the exam rules on the client.
  const startAttempt = request.nextUrl.searchParams.get("start") === "1";
  const payload = await getExamForTaking(
    id,
    user.uid,
    user.name || user.email || "Student",
    startAttempt,
  );
  if (!payload) {
    return NextResponse.json(
      { error: "Exam not found or not available." },
      { status: 404 },
    );
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
