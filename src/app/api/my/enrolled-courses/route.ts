import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured, query } from "@/lib/mysql";
import { getMyEnrolledCourses } from "@/lib/my-learning";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const courses = await getMyEnrolledCourses(user.uid);
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json(
      { error: "Could not load your enrolled courses." },
      { status: 500 },
    );
  }
}
