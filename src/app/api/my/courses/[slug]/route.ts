import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import { getCourseLearningData, hasActiveEnrollment } from "@/lib/my-learning";

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
      return NextResponse.json(
        {
          error: enrolled
            ? "This course is not available."
            : "You are not enrolled in this course.",
        },
        { status: enrolled ? 404 : 403 },
      );
    }
    return NextResponse.json({ course });
  } catch {
    return NextResponse.json(
      { error: "Could not load this course." },
      { status: 500 },
    );
  }
}
