import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { fetchResults, deleteResult } from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

/** ?examId=... — submitted results for an exam (or all). */
export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "manageResults"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const examId = request.nextUrl.searchParams.get("examId") ?? undefined;
  const results = await fetchResults(examId || undefined);
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "manageResults"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Missing result id." }, { status: 400 });
  }
  await deleteResult(id);
  await logAdminAction(admin, "result.delete", `#${id}`, request);
  return NextResponse.json({ ok: true });
}
