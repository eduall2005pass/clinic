import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchSystemStatus } from "@/lib/admin-profile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const status = await fetchSystemStatus();
  return NextResponse.json(
    {
      ...status,
      runtime: {
        nodeVersion: process.version,
        region: process.env.VERCEL_REGION ?? null,
        uptimeSeconds: Math.round(process.uptime()),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
