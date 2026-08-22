import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchMediaLibrary,
  deleteMediaItem,
  fetchUploadStats,
} from "@/lib/content-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (request.nextUrl.searchParams.get("stats") === "1") {
    const stats = await fetchUploadStats();
    return NextResponse.json({ stats });
  }
  const media = await fetchMediaLibrary();
  return NextResponse.json(
    { media },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing file id." }, { status: 400 });
  }
  const deleted = await deleteMediaItem(body.id);
  if (!deleted) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  await logAdminAction(admin, "media.delete", body.id, request);
  const media = await fetchMediaLibrary();
  return NextResponse.json({ media });
}
