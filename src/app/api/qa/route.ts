import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import {
  fetchQaSubjects,
  fetchQaQuestions,
  insertQaQuestion,
} from "@/lib/qa-store";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

/** Public read: subjects + questions (per subject) for the website Q&A. */
export async function GET(request: NextRequest) {
  const subjectId =
    request.nextUrl.searchParams.get("subject")?.trim() ?? "";
  const [subjects, questions] = await Promise.all([
    fetchQaSubjects(true),
    fetchQaQuestions(subjectId ? { subjectId } : {}),
  ]);
  return NextResponse.json(
    { subjects, questions },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Ask a question — requires a signed-in student. */
export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to ask a question." },
      { status: 401 },
    );
  }
  if (!isMysqlConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | { subjectId?: unknown; text?: unknown }
    | null;
  const subjectId = typeof body?.subjectId === "string" ? body.subjectId.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!subjectId || text.length < 5) {
    return NextResponse.json(
      { error: "Select a subject and write your question (at least 5 characters)." },
      { status: 400 },
    );
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Question is too long (max 2000 characters)." },
      { status: 400 },
    );
  }

  // Resolve a display name from the students table when available.
  let studentName = user.name ?? user.email?.split("@")[0] ?? "Student";
  try {
    const rows = await query<{ full_name: string | null }[]>(
      "SELECT full_name FROM students WHERE uid = ? LIMIT 1",
      [user.uid],
    );
    if (rows[0]?.full_name) studentName = rows[0].full_name;
  } catch {
    // keep token-derived name
  }

  const created = await insertQaQuestion({
    subjectId,
    studentUid: user.uid,
    studentName,
    text,
  });
  if (!created) {
    return NextResponse.json(
      { error: "Failed to save your question. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ question: created }, { status: 201 });
}
