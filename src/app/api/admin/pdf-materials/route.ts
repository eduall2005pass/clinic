import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { fetchPdfMaterials, savePdfMaterial, deletePdfMaterial } from "@/lib/pdf-materials";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent", "manageExams"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const { fetchPdfMaterialById } = await import("@/lib/pdf-materials");
    const mat = await fetchPdfMaterialById(Number(id));
    if (!mat) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ material: mat }, { headers: { "Cache-Control": "no-store" } });
  }
  const materials = await fetchPdfMaterials();
  return NextResponse.json({ materials }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent", "manageExams"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  try {
    const mat = await savePdfMaterial(body, admin.email ?? admin.uid);
    await logAdminAction(admin, "pdf-material.save", String(mat.id), request);
    return NextResponse.json({ material: mat });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save material.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent", "manageExams"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id ?? request.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  try {
    await deletePdfMaterial(id);
    await logAdminAction(admin, "pdf-material.delete", String(id), request);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
