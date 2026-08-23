import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  deleteTaxonomyItem,
  fetchCourseOptions,
  fetchCourseSubjectDetails,
  saveCourseSubjects,
  updateCourseSubject,
} from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

/** GET → { subjects: [{ id, name, isActive, assignedCourseSlugs }], courses: [{ slug, name }] }. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [subjects, courses] = await Promise.all([
    fetchCourseSubjectDetails(),
    fetchCourseOptions(),
  ]);
  return NextResponse.json(
    { subjects, courses },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Bulk-save subjects: { subjects: [{ id?, name, isActive, assignedCourseSlugs? }] }.
 * Handles create, rename, enable/disable and display order in one shot.
 */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
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
    for (const raw of body.subjects as Array<Record<string, unknown>>) {
      if (
        typeof raw.id === "string" &&
        raw.id &&
        Array.isArray(raw.assignedCourseSlugs)
      ) {
        await updateCourseSubject(raw.id, {
          name: typeof raw.name === "string" ? raw.name : undefined,
          isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
          assignedCourseSlugs: raw.assignedCourseSlugs.map(String),
        });
      }
    }
    const subjects = await saveCourseSubjects(
      body.subjects as Array<Record<string, unknown>>,
    );
    const detailed = await fetchCourseSubjectDetails();
    // Preserve assignment data on the bulk-saved rows.
    const byId = new Map(detailed.map((s) => [s.id, s]));
    const merged = subjects.map((s) => byId.get(s.id) ?? s);
    await logAdminAction(admin, "subject.save", "bulk update", request);
    return NextResponse.json({ subjects: merged });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save subjects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH — single-subject edit/assign: { id, name?, isActive?, assignedCourseSlugs? }. */
export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing subject id." }, { status: 400 });
  }
  try {
    const patch: Parameters<typeof updateCourseSubject>[1] = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if (Array.isArray(body.assignedCourseSlugs)) {
      patch.assignedCourseSlugs = body.assignedCourseSlugs.map(String);
    }
    const subjects = await updateCourseSubject(body.id, patch);
    await logAdminAction(admin, "subject.update", body.id, request);
    return NextResponse.json({ subjects });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the subject.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing subject id." }, { status: 400 });
  }
  await deleteTaxonomyItem("course_subjects", body.id);
  await logAdminAction(admin, "subject.delete", body.id, request);
  const subjects = await fetchCourseSubjectDetails();
  return NextResponse.json({ subjects });
}
