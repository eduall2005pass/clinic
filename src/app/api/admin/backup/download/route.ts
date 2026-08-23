import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { getBackupJson } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/backup/download?id=... — streams a stored backup JSON to an
 * authorized admin. Backup files are intentionally NOT reachable through the
 * public /api/files endpoint.
 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageSystem");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing backup id." }, { status: 400 });
  }
  try {
    const backup = await getBackupJson(id);
    if (!backup) {
      return NextResponse.json({ error: "Backup not found." }, { status: 404 });
    }
    await logAdminAction(admin, "backup.download", backup.fileName, request);
    return new NextResponse(JSON.stringify(backup.payload), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read the backup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
