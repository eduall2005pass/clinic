import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchActivityLogs } from "@/lib/administration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const logs = await fetchActivityLogs(Number.isInteger(limitParam) ? limitParam : 200);
  return NextResponse.json(
    { logs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
