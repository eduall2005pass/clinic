import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  attachBankQuestion,
  deleteQuestion,
  duplicateQuestion,
  fetchQuestions,
  reorderQuestions,
  saveQuestion,
  saveQuestionsBulk,
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
  // Duplicate a question within same exam: { duplicateId: number }
  if (body.duplicateId !== undefined) {
    const dupId = Number(body.duplicateId);
    if (!Number.isInteger(dupId) || dupId <= 0) {
      return NextResponse.json({ error: "Invalid duplicateId." }, { status: 400 });
    }
    try {
      const questions = await duplicateQuestion(dupId);
      await logAdminAction(admin, "question.duplicate", `id=${dupId}`, request);
      return NextResponse.json({ questions });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to duplicate question.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  // Bulk save: { examId, questions: [...] } — saves only changed questions in one request (fast, 1 roundtrip)
  if (Array.isArray((body as Record<string, unknown>).questions)) {
    const examId = String((body as Record<string, unknown>).examId ?? "").trim();
    const items = (body as Record<string, unknown>).questions as Record<string, unknown>[];
    try {
      const result = await saveQuestionsBulk(examId, items);
      await logAdminAction(admin, "question.bulk_save", `exam=${examId} count=${items.length}`, request);
      return NextResponse.json({ ok: true, questions: result.questions, savedIds: result.savedIds });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save questions.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  try {
    const result = await saveQuestion(body);
    await logAdminAction(admin, "question.save", String(body.subject ?? ""), request);
    // Return fresh exam questions so client can sync without a second fetch when possible
    return NextResponse.json({ ok: true, questions: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the question.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { examId?: unknown; order?: unknown } | null;
  const examIdRaw = typeof body?.examId === "string" ? body.examId.trim() : "";
  const examId = examIdRaw === "bank" ? null : examIdRaw || null;
  // Allow null for bank reorder as well (examId may be null or omitted)
  if (!Array.isArray(body?.order)) {
    return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
  }
  const ids = (body.order as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return NextResponse.json({ error: "No valid ids." }, { status: 400 });
  try {
    const questions = await reorderQuestions(examId, ids);
    await logAdminAction(admin, "question.reorder", `exam=${examId ?? "bank"} count=${ids.length}`, request);
    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder.";
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
