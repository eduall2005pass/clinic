import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import { hasActiveEnrollment } from "@/lib/my-learning";
import { getFlow4CourseData } from "@/lib/flow4";

export const dynamic = "force-dynamic";

// Student Flow 4 read — enrollment-gated
// GET ?course=slug → { subjects: [...] } with chapters & contents
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const slug = request.nextUrl.searchParams.get("course") ?? "";
  if (!slug) return NextResponse.json({ error: "Missing course." }, { status: 400 });
  const enrolled = await hasActiveEnrollment(user.uid, slug);
  if (!enrolled) return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
  try {
    const data = await getFlow4CourseData(slug);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load course content." }, { status: 500 });
  }
}
