import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { query } from "@/lib/mysql";
import { logAdminAction } from "@/lib/administration";
import {
  fetchCatalogCourses,
  fetchCatalogCourse,
  rowToCourse,
  getCoursesByCategory,
  saveCatalogCourse,
  deleteCatalogCourse,
  setCatalogCourseFlags,
  syncCatalogCategoryIds,
} from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Admin catalog reads are permission-gated (includes unpublished courses).
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug) {
    const course = await fetchCatalogCourse(slug);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    return NextResponse.json(
      { course },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  // Backend-enforced category isolation via the ONE shared logic:
  // ?category=<ENUM name> (legacy) or ?categoryId=<course_categories.id>.
  const categoryName = request.nextUrl.searchParams.get("category");
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  if (categoryId && categoryId.trim()) {
    const result = await getCoursesByCategory(categoryId);
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "invalid-category"
              ? "Invalid category."
              : "Could not load courses.",
        },
        { status: result.reason === "invalid-category" ? 404 : 500 },
      );
    }
    return NextResponse.json(
      { courses: result.courses },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (categoryName && categoryName.trim()) {
    try {
      await syncCatalogCategoryIds();
      const rows = await query(
        `SELECT c.* FROM catalog_courses c
           LEFT JOIN course_categories cc ON cc.id = c.category_id
          WHERE c.category = ?
          ORDER BY c.sort_order ASC, c.name ASC`,
        [categoryName.trim()],
      );
      return NextResponse.json(
        { courses: (rows as never[]).map((r) => rowToCourse(r as never)) },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load courses.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  const courses = await fetchCatalogCourses();
  return NextResponse.json(
    { courses },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create or update a course. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.slug !== "string") {
    return NextResponse.json(
      { error: "Course slug and details are required." },
      { status: 400 },
    );
  }
  try {
    const course = await saveCatalogCourse(body, admin.uid);
    await logAdminAction(admin, "course.save", `slug=${course.slug}`, request);
    return NextResponse.json({ course });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save the course.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Quick flags update: { slug, status?, featured? }. */
export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.slug !== "string" || !body.slug) {
    return NextResponse.json({ error: "Missing course slug." }, { status: 400 });
  }
  const status =
    body.status === "published" || body.status === "unpublished"
      ? body.status
      : undefined;
  const featured = typeof body.featured === "boolean" ? body.featured : undefined;
  if (status === undefined && featured === undefined) {
    return NextResponse.json(
      { error: "Nothing to update — pass status and/or featured." },
      { status: 400 },
    );
  }
  try {
    const course = await setCatalogCourseFlags(body.slug, {
      status,
      featured,
    });
    await logAdminAction(admin, "course.flags", `slug=${body.slug}`, request);
    return NextResponse.json({ course });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the course.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
  if (typeof body?.slug !== "string" || !body.slug) {
    return NextResponse.json({ error: "Missing course slug." }, { status: 400 });
  }
  try {
    const deleted = await deleteCatalogCourse(body.slug);
    if (!deleted) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    await logAdminAction(admin, "course.delete", `slug=${body.slug}`, request);
    const courses = await fetchCatalogCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete the course.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
