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
  const payload = await getExamForTaking(
    id,
    user.uid,
    user.name || user.email || "Student",
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
