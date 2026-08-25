import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { isMysqlConfigured } from "@/lib/mysql";
import { fetchEnrollmentControlCourses } from "@/lib/enrollments-admin";

export const dynamic = "force-dynamic";

/** GET — published courses with per-course pending application counts. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
    return NextResponse.json({ courses: [] });
  }
  try {
    const courses = await fetchEnrollmentControlCourses();
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
