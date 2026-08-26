import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { isMysqlConfigured, query } from "@/lib/mysql";
import { fetchEnrollmentControlCourses } from "@/lib/enrollments-admin";
import { syncCatalogCategoryIds } from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

/** GET — published courses with per-course pending application counts.
 *  Optional ?categoryId= returns ONLY that Course Control category's courses. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
    return NextResponse.json({ courses: [] });
  }
  const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim() ?? "";
  try {
    if (categoryId) {
      // Validate the category + keep course↔category linkage fresh.
      await syncCatalogCategoryIds();
      const cats = await query<Array<{ id: string }>>(
        `SELECT id FROM course_categories WHERE id = ? LIMIT 1`,
        [categoryId],
      );
      if (cats.length === 0) {
        return NextResponse.json({ error: "Invalid category." }, { status: 404 });
      }
    }
    const courses = await fetchEnrollmentControlCourses(
      categoryId || undefined,
    );
    return NextResponse.json({ courses }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load the course list." },
      { status: 500 },
    );
  }
}
