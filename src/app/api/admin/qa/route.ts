import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { isMysqlConfigured } from "@/lib/mysql";
import {
  fetchQaBrowseSubjects,
  fetchQaSubjects,
  fetchQaQuestions,
  saveQaSubject,
  deleteQaSubject,
  answerQaQuestion,
  deleteQaQuestion,
} from "@/lib/qa-store";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** GET → all subjects (incl. inactive) + every question. When ?subject= is
 *  given, returns only that subject (merged legacy + Course Control list)
 *  and its questions, optionally filtered server-side by ?status=. */
export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageContent", "manageQa"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const subjectId = request.nextUrl.searchParams.get("subject")?.trim() ?? "";
  const statusRaw = request.nextUrl.searchParams.get("status")?.trim() ?? "";
  const status =
    statusRaw === "unanswered" || statusRaw === "answered"
      ? statusRaw
      : undefined;

  if (subjectId) {
    const [legacySubjects, courseSubjects] = await Promise.all([
      fetchQaSubjects(false),
      fetchQaBrowseSubjects(),
    ]);
    const seen = new Set<string>();
    const subjects = [...legacySubjects, ...courseSubjects].filter((subject) => {
      if (seen.has(subject.id)) return false;
      seen.add(subject.id);
      return true;
    });
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) {
      return NextResponse.json({ error: "Unknown subject." }, { status: 404 });
    }
    // Backend-enforced isolation: WHERE subject_id = ? [AND status = ?]
    const questions = await fetchQaQuestions({ subjectId, status });
    return NextResponse.json(
      { subject, questions },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [legacySubjects, courseSubjects, questions] = await Promise.all([
    fetchQaSubjects(false),
    fetchQaBrowseSubjects(),
    fetchQaQuestions({}),
  ]);
  // Merge legacy Q&A subjects with the Course Control subjects so every
  // question (old and new course-context ones) is reachable from the UI.
  const seen = new Set<string>();
  const subjects = [...legacySubjects, ...courseSubjects].filter((subject) => {
    if (seen.has(subject.id)) return false;
    seen.add(subject.id);
    return true;
  });
  return NextResponse.json(
    { subjects, questions },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST actions:
 *  - { action: "addSubject", name }
 *  - { action: "answer", questionId, content }
 */
export async function POST(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageContent", "manageQa"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; name?: unknown; questionId?: unknown; content?: unknown }
    | null;

  if (body?.action === "addSubject") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Subject name must be 2–80 characters." },
        { status: 400 },
      );
    }
    const existing = await fetchQaSubjects(false);
    if (existing.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: "A subject with this name already exists." },
        { status: 400 },
      );
    }
    const id = slugify(name) || `subject-${Date.now().toString(36)}`;
    const maxOrder = existing.reduce((max, s) => Math.max(max, s.order), 0);
    try {
      await saveQaSubject(id, name, maxOrder + 1);
    } catch {
      return NextResponse.json(
        { error: "Failed to add the subject." },
        { status: 500 },
      );
    }
    return NextResponse.json({ subjects: await fetchQaSubjects(false) }, { status: 201 });
  }

  if (body?.action === "answer") {
    const questionId =
      typeof body.questionId === "string" ? body.questionId.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!questionId || content.length < 2) {
      return NextResponse.json(
        { error: "Question and answer text are required." },
        { status: 400 },
      );
    }
    const teacherName =
      admin.name ?? admin.email ?? "Teacher";
    const ok = await answerQaQuestion(questionId, content, teacherName);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save the answer." },
        { status: 500 },
      );
    }
    return NextResponse.json({ questions: await fetchQaQuestions({}) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/**
 * PUT — rename a subject: { subjectId, name }.
 * DELETE — ?subject=<id> removes the subject and its questions;
 *          ?question=<id> removes one question.
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageContent", "manageQa"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { subjectId?: unknown; name?: unknown }
    | null;
  const subjectId =
    typeof body?.subjectId === "string" ? body.subjectId.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!subjectId || name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { error: "Subject and a valid new name are required." },
      { status: 400 },
    );
  }
  const subjects = await fetchQaSubjects(false);
  const current = subjects.find((s) => s.id === subjectId);
  if (!current) {
    return NextResponse.json({ error: "Unknown subject." }, { status: 404 });
  }
  try {
    await saveQaSubject(subjectId, name, current.order);
  } catch {
    return NextResponse.json(
      { error: "Failed to update the subject." },
      { status: 500 },
    );
  }
  return NextResponse.json({ subjects: await fetchQaSubjects(false) });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageContent", "manageQa"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const subjectId = request.nextUrl.searchParams.get("subject")?.trim() ?? "";
  const questionId = request.nextUrl.searchParams.get("question")?.trim() ?? "";

  if (subjectId) {
    const ok = await deleteQaSubject(subjectId);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to delete the subject." },
        { status: 500 },
      );
    }
    const [subjects, questions] = await Promise.all([
      fetchQaSubjects(false),
      fetchQaQuestions({}),
    ]);
    return NextResponse.json({ subjects, questions });
  }

  if (questionId) {
    const ok = await deleteQaQuestion(questionId);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to delete the question." },
        { status: 500 },
      );
    }
    return NextResponse.json({ questions: await fetchQaQuestions({}) });
  }

  return NextResponse.json(
    { error: "Provide ?subject= or ?question=." },
    { status: 400 },
  );
}
