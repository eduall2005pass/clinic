import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  fetchCourseSubjects,
  saveCourseSubjects,
  deleteTaxonomyItem,
} from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const subjects = await fetchCourseSubjects();
  return NextResponse.json(
    { subjects },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Bulk-save subjects: { subjects: [{ id?, name, isActive }] }. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { subjects?: unknown }
    | null;
  if (!body || !Array.isArray(body.subjects)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  try {
    const subjects = await saveCourseSubjects(
      body.subjects as Array<Record<string, unknown>>,
    );
    return NextResponse.json({ subjects });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save subjects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing subject id." }, { status: 400 });
  }
  await deleteTaxonomyItem("course_subjects", body.id);
  const subjects = await fetchCourseSubjects();
  return NextResponse.json({ subjects });
}
