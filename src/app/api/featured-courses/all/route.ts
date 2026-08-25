import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchAllFeaturedCourses } from "@/lib/featured-courses";

export const dynamic = "force-dynamic";

/** Admin-only: full list including drafts. Public GET is cached separately. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const data = await fetchAllFeaturedCourses();
  return NextResponse.json({ courses: data });
}
