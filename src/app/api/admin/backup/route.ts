import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { createBackup, deleteBackup, listBackups } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageSystem");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const backups = await listBackups();
  return NextResponse.json(
    { backups },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST — create a new backup snapshot. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageSystem");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const backup = await createBackup(admin.email ?? admin.uid);
    await logAdminAction(admin, "backup.create", backup.fileName, request);
    const backups = await listBackups();
    return NextResponse.json({ backup, backups });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create the backup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — remove a stored backup. */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageSystem");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing backup id." }, { status: 400 });
  }
  try {
    const removed = await deleteBackup(body.id);
    if (!removed) {
      return NextResponse.json({ error: "Backup not found." }, { status: 404 });
    }
    await logAdminAction(admin, "backup.delete", body.id, request);
    const backups = await listBackups();
    return NextResponse.json({ backups });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete the backup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
