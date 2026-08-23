import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchSystemStatus } from "@/lib/admin-profile";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { isMysqlConfigured } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageAdmins");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const status = await fetchSystemStatus();
  return NextResponse.json(
    {
      ...status,
      firebaseAdminConfigured: isFirebaseAdminConfigured,
      // This endpoint answering IS the API/backend health check.
      apiOnline: true,
      runtime: {
        nodeVersion: process.version,
        region: process.env.VERCEL_REGION ?? null,
        uptimeSeconds: Math.round(process.uptime()),
        mysqlConfigured: isMysqlConfigured,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
