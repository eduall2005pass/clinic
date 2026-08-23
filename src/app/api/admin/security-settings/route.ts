import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction, fetchSecuritySettings, saveSecuritySettings } from "@/lib/administration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageAdmins");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await fetchSecuritySettings();
  return NextResponse.json(
    { settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageAdmins");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const settings = await saveSecuritySettings(body, admin.uid);
    await logAdminAction(admin, "security.save", undefined, request);
    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save security settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
