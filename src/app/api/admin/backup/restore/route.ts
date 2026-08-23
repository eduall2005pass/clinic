import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { restoreBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backup/restore — body { id, confirm: true }.
 * Requires the explicit confirm flag; overwrites rows with the same
 * primary keys and reports per-table counts plus skipped tables.
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageSystem");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { id?: unknown; confirm?: unknown }
    | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing backup id." }, { status: 400 });
  }
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Restore requires explicit confirmation." },
      { status: 400 },
    );
  }
  try {
    const summary = await restoreBackup(body.id);
    await logAdminAction(
      admin,
      "backup.restore",
      `${body.id} (${Object.keys(summary.tables).length} tables)`,
      request,
    );
    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to restore the backup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
