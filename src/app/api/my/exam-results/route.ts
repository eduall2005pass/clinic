import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import {
  getStudentExamResultGroups,
  type StudentExamResultGroup,
} from "@/lib/my-exam-results";
import { getMyEnrolledCourses } from "@/lib/my-learning";

export const dynamic = "force-dynamic";

type CourseOption = { slug: string; name: string };

/**
 * GET — the logged-in student's exam results grouped course-wise, plus the
 * enrolled-course options for the selector (live enrollment data only).
 */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const [groups, enrolled] = await Promise.all([
    getStudentExamResultGroups(user.uid),
    getMyEnrolledCourses(user.uid),
  ]);
  // Only courses with an ACTIVE enrollment appear — never hard-coded.
  const courses: CourseOption[] = enrolled.map((course) => ({
    slug: course.slug,
    name: course.name,
  }));
  return NextResponse.json(
    { groups: groups as StudentExamResultGroup[], courses },
    { headers: { "Cache-Control": "no-store" } },
  );
}
