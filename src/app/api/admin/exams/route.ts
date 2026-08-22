import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchExams,
  saveExam,
  deleteExam,
  type ExamKind,
} from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind =
    kindParam === "public" || kindParam === "practice"
      ? (kindParam as ExamKind)
      : undefined;
  const exams = await fetchExams(kind);
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
