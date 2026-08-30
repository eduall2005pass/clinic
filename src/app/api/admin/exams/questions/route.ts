import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  attachBankQuestion,
  fetchQuestions,
  saveQuestion,
  deleteQuestion,
} from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

/** ?examId=... (or examId=bank for bank-only) & ?subject=... */
export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const questions = await fetchQuestions({
    examId: params.get("examId") ?? undefined,
    subject: params.get("subject") ?? undefined,
  });
  return NextResponse.json(
    { questions },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    await saveQuestion(body);
    await logAdminAction(admin, "question.save", String(body.subject ?? ""), request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the question.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** PATCH — attach a copy of a bank question to an exam: { id, examId }. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown; examId?: unknown } | null;
  const id = Number(body?.id);
  const examId = typeof body?.examId === "string" ? body.examId : "";
  if (!Number.isInteger(id) || !examId) {
    return NextResponse.json({ error: "Missing question id or exam id." }, { status: 400 });
  }
  try {
    const questions = await attachBankQuestion(id, examId);
    await logAdminAction(admin, "question.attach", `question=${id} exam=${examId}`, request);
    return NextResponse.json({ questions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to attach the question.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Missing question id." }, { status: 400 });
  }
  await deleteQuestion(id);
  return NextResponse.json({ ok: true });
}
