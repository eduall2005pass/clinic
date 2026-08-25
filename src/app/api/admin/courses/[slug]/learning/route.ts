import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { isMysqlConfigured } from "@/lib/mysql";
import { getAdminCourseLearningData } from "@/lib/my-learning";

export const dynamic = "force-dynamic";

/**
 * Admin variant of the student /api/my/courses/[slug] tree.
 * SAME hierarchy and payload shape (Course → Subjects → Papers/Segments →
 * Chapters → Classes · Exams · Materials), but authorized by Admin
 * permission instead of student enrollment. Data source: same MySQL tables.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }
  const { slug } = await context.params;
  try {
    const course = await getAdminCourseLearningData(slug);
    if (!course) {
      return NextResponse.json(
        { error: "This course does not exist." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { course },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load this course." },
      { status: 500 },
    );
  }
}
