import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  deleteExamRule,
  fetchExamRules,
  reorderExamRules,
  saveExamRule,
} from "@/lib/exam-rules";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/** GET ?examId=… — rules of one specific exam (strictly exam-scoped). */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageExams");
  if (!admin) return unauthorized();
  const examId = request.nextUrl.searchParams.get("examId")?.trim() ?? "";
  if (!/^[a-z0-9-]{2,64}$/.test(examId)) {
    return NextResponse.json({ error: "A valid exam is required." }, { status: 400 });
  }
  return NextResponse.json(
    { examId, rules: await fetchExamRules(examId) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST — add or edit a rule. Body: { examId, id?, title, text }. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageExams");
  if (!admin) return unauthorized();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const rules = await saveExamRule(body);
    await logAdminAction(
      admin,
      "exam-rules.save",
      `exam=${String(body.examId)} id=${String(body.id ?? "new")}`,
      request,
    );
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save the rule." },
      { status: 400 },
    );
  }
}

/** PUT — reorder within one exam. Body: { examId, order: [id, …] }. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageExams");
  if (!admin) return unauthorized();
  const body = (await request.json().catch(() => null)) as
    | { examId?: unknown; order?: unknown }
    | null;
  const examId = typeof body?.examId === "string" ? body.examId.trim() : "";
  if (!/^[a-z0-9-]{2,64}$/.test(examId) || !Array.isArray(body?.order)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const ids = body!.order.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return NextResponse.json({ rules: await reorderExamRules(examId, ids) });
}

/** DELETE — body: { examId, id }. */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageExams");
  if (!admin) return unauthorized();
  const body = (await request.json().catch(() => null)) as
    | { examId?: unknown; id?: unknown }
    | null;
  const examId = typeof body?.examId === "string" ? body.examId.trim() : "";
  const id = Number(body?.id);
  if (!/^[a-z0-9-]{2,64}$/.test(examId) || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  await logAdminAction(admin, "exam-rules.delete", `exam=${examId} id=${id}`, request);
  return NextResponse.json({ rules: await deleteExamRule(examId, id) });
}
