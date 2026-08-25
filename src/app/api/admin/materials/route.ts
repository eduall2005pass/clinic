import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchMaterials,
  saveMaterial,
  deleteMaterial,
  reorderMaterials,
} from "@/lib/course-papers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const chapterId = request.nextUrl.searchParams.get("chapterId") ?? undefined;
  const materials = await fetchMaterials(chapterId || undefined);
  return NextResponse.json(
    { materials },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create/update a material: { id?, chapterId, title, materialType, fileUrl }. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const materials = await saveMaterial(body);
    await logAdminAction(admin, "material.save", String(body.id ?? body.title ?? ""), request);
    return NextResponse.json({ materials });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the material.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Change display order: { order: [id, …] }. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { order?: unknown }
    | null;
  if (
    !body ||
    !Array.isArray(body.order) ||
    !body.order.every((item) => Number.isFinite(Number(item)))
  ) {
    return NextResponse.json(
      { error: "Invalid request body — expected { order: [id, …] }." },
      { status: 400 },
    );
  }
  try {
    const materials = await reorderMaterials(
      (body.order as unknown[]).map((item) => Number(item)),
    );
    await logAdminAction(admin, "material.update", "reorder", request);
    return NextResponse.json({ materials });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder materials.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "number" ? body.id : Number(body?.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing material id." }, { status: 400 });
  }
  try {
    await deleteMaterial(id);
    await logAdminAction(admin, "material.delete", String(id), request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete the material.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
