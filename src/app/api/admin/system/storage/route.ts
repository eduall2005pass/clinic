import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchUploadStats } from "@/lib/content-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const stats = await fetchUploadStats();
  return NextResponse.json(
    {
      storage: {
        ...stats,
        note: "All uploads live in the MySQL `uploads` table (LONGBLOB) and are served via /api/files/[id].",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
