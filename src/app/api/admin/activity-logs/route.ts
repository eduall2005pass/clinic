import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchFilteredActivityLogs } from "@/lib/administration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageAdmins");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const limitParam = Number(params.get("limit"));
  const logs = await fetchFilteredActivityLogs(
    {
      q: params.get("q") ?? undefined,
      module: params.get("module") ?? undefined,
      action: params.get("action") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    },
    Number.isInteger(limitParam) ? limitParam : 200,
  );
  return NextResponse.json(
    { logs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
