import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { getExamResultScript } from "@/lib/exam-taking";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/[id]/result — the student's answer script for their most
 * recent submitted attempt (chosen + correct answers). Only exists AFTER a
 * submission; during an active exam there is nothing to reveal.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const script = await getExamResultScript(id, user.uid);
  if (!script) {
    return NextResponse.json(
      { error: "No submitted result found for this exam yet." },
      { status: 404 },
    );
  }

  return NextResponse.json(script, {
    headers: { "Cache-Control": "no-store" },
  });
}
