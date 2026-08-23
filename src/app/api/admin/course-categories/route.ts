import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchCourseCategories,
  saveCourseCategories,
  deleteTaxonomyItem,
} from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await fetchCourseCategories();
  return NextResponse.json(
    { categories },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Bulk-save categories: { categories: [{ id?, name, isActive }] }. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { categories?: unknown }
    | null;
  if (!body || !Array.isArray(body.categories)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  try {
    const categories = await saveCourseCategories(
      body.categories as Array<Record<string, unknown>>,
    );
    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save categories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing category id." }, { status: 400 });
  }
  await deleteTaxonomyItem("course_categories", body.id);
  const categories = await fetchCourseCategories();
  return NextResponse.json({ categories });
}
