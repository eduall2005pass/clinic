import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { duplicateExam } from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Missing exam id." }, { status: 400 });
  try {
    const exam = await duplicateExam(id, admin.uid);
    await logAdminAction(admin, "exam.duplicate", `id=${id} -> ${exam.id}`, request);
    return NextResponse.json({ exam });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate exam.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
