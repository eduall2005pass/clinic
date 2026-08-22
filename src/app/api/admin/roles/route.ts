import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction, fetchRoleAssignments, saveRoleAssignments } from "@/lib/administration";

export const dynamic = "force-dynamic";

export async function GET() {
  const assignments = await fetchRoleAssignments();
  return NextResponse.json(
    { assignments },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Bulk-save role assignments: { assignments: [{ email, role }] }. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { assignments?: unknown }
    | null;
  if (!body || !Array.isArray(body.assignments)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const assignments = await saveRoleAssignments(
      body.assignments as Array<Record<string, unknown>>,
      admin.uid,
    );
    await logAdminAction(admin, "roles.save", `count=${assignments.length}`, request);
    return NextResponse.json({ assignments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save role assignments.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
