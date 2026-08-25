import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import { getCourseLearningData, hasActiveEnrollment } from "@/lib/my-learning";
import { getLiveCourse } from "@/lib/course-catalog";
import { getCourseKind } from "@/lib/enrollments";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { slug } = await context.params;
  try {
    const course = await getCourseLearningData(user.uid, slug);
    if (!course) {
      // Not enrolled (403) vs unknown/unpublished course (404).
      const enrolled = await hasActiveEnrollment(user.uid, slug);
      if (!enrolled) {
        // courseKind helps the client show the right guidance card.
        // The request is still DENIED — this metadata never unlocks content.
        let courseKind: "free" | "paid" | undefined;
        try {
          const live = await getLiveCourse(slug);
          courseKind = live ? getCourseKind(live) : undefined;
        } catch {
          courseKind = undefined;
        }
        return NextResponse.json(
          {
            error: "You are not enrolled in this course.",
            courseKind,
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "This course is not available." },
        { status: 404 },
      );
    }
    return NextResponse.json({ course });
  } catch (error) {
    // Surface the real cause in server logs for debugging.
    console.error(`[api/my/courses/${slug}] failed:`, error);
    return NextResponse.json(
      { error: "Could not load this course." },
      { status: 500 },
    );
  }
}
