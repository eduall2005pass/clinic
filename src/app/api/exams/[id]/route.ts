import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { getExamForTaking } from "@/lib/exam-taking";
import { fetchExamPageById } from "@/lib/public-exams-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/[id] — exam meta + sanitized questions (no answers).
 *
 * Server-side access validation:
 * 1. Authentication required
 * 2. Exam must exist and be published
 * 3. Exam must be active (Live or Available status)
 * 4. Current time must be within the allowed exam window
 * 5. Attempt limit is enforced by the Common Exam Engine
 * 6. Enrolled exams require course enrollment (checked by getExamForTaking)
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

  // The attempt (timer + answer storage) begins only with ?start=1 — i.e.
  // after the student accepts the exam rules on the client.
  const startAttempt = request.nextUrl.searchParams.get("start") === "1";
  const timerType = request.nextUrl.searchParams.get("timer") ?? "first";

  // Server-side access validation before creating an attempt.
  if (startAttempt) {
    const examMeta = await fetchExamPageById(id);
    if (!examMeta) {
      return NextResponse.json(
        { error: "Exam not found." },
        { status: 404 },
      );
    }

    // Exam must be published and active.
    if (!examMeta.published) {
      return NextResponse.json(
        { error: "This exam is not published yet." },
        { status: 403 },
      );
    }

    if (examMeta.status === "Inactive" || examMeta.status === "Unpublished") {
      return NextResponse.json(
        { error: "This exam is not active." },
        { status: 403 },
      );
    }

    if (examMeta.status === "Completed" || examMeta.status === "Expired") {
      return NextResponse.json(
        { error: "This exam has ended. You can no longer start it." },
        { status: 403 },
      );
    }

    // Timer type validation — must be "first" or "second".
    if (timerType !== "first" && timerType !== "second") {
      return NextResponse.json(
        { error: "Invalid timer type. Must be 'first' or 'second'." },
        { status: 400 },
      );
    }
  }

  const payload = await getExamForTaking(
    id,
    user.uid,
    user.name || user.email || "Student",
    startAttempt,
    timerType as "first" | "second",
  );
  if (!payload) {
    // Distinguish missing ID vs genuinely unavailable (draft/closed/enrolled)
    // to avoid showing "No exam found" due to category/status mismatches.
    const { fetchExamById } = await import("@/lib/exams-admin");
    const direct = await fetchExamById(id);
    if (!direct) {
      return NextResponse.json({ error: "Exam not found." }, { status: 404 });
    }
    if (direct.status === "draft") {
      return NextResponse.json({ error: "This exam is not published yet." }, { status: 403 });
    }
    if (direct.kind === "enrolled") {
      return NextResponse.json({ error: "You are not enrolled for this exam." }, { status: 403 });
    }
    // Published but otherwise unavailable (e.g. no questions, or not Live)
    return NextResponse.json(
      { error: "Exam not found or not available." },
      { status: 404 },
    );
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
