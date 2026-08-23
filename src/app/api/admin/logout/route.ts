import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";

export const dynamic = "force-dynamic";

/** POST /api/admin/logout — records the logout, then the client signs out. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  await logAdminAction(admin, "logout", undefined, request);
  return NextResponse.json({ ok: true });
}
