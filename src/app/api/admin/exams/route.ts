import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchExams,
  saveExam,
  deleteExam,
  setExamStatus,
  EXAM_KINDS,
  type ExamKind,
  type ExamStatus,
} from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ?kind=enrolled or ?kind=public,practice (comma-separated).
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kinds = kindParam
    ? kindParam
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is ExamKind =>
          EXAM_KINDS.includes(value as ExamKind),
        )
    : [];
  const exams =
    kinds.length > 0
      ? (await fetchExams()).filter((exam) => kinds.includes(exam.kind))
      : await fetchExams();
  return NextResponse.json(
    { exams },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create or update an exam (including its answer key). */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") {
    return NextResponse.json(
      { error: "Exam id and title are required." },
      { status: 400 },
    );
  }
  try {
    const exam = await saveExam(body, admin.uid);
    await logAdminAction(admin, "exam.save", `id=${exam.id}`, request);
    return NextResponse.json({ exam });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the exam.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Quick publish/unpublish/close: { id, status }. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing exam id." }, { status: 400 });
  }
  const status = String(body.status);
  if (!["draft", "published", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  try {
    await setExamStatus(body.id, status as ExamStatus);
    await logAdminAction(admin, "exam.status", `id=${body.id} status=${status}`, request);
    const exams = await fetchExams();
    return NextResponse.json({ exams });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the exam.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing exam id." }, { status: 400 });
  }
  await deleteExam(body.id);
  await logAdminAction(admin, "exam.delete", `id=${body.id}`, request);
  const exams = await fetchExams();
  return NextResponse.json({ exams });
}
