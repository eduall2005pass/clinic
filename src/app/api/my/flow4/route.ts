import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import { hasActiveEnrollment } from "@/lib/my-learning";
import { getFlow4CourseData, getFlow4DirectContents, getFlow4DirectCourseData, getFlow4Subjects } from "@/lib/flow4";

export const dynamic = "force-dynamic";

// Student Flow 4 read — enrollment-gated
// GET ?course=slug → { subjects: [...] } with chapters & contents (legacy) OR direct when &direct=1
// GET ?course=slug&subject=id&direct=1 → { contents: [...] } direct per-subject contents (NEW spec Flow 4)
// GET ?course=slug&subject=id → legacy chapter list (kept for existing Flow 4 data)
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const slug = request.nextUrl.searchParams.get("course") ?? "";
  if (!slug) return NextResponse.json({ error: "Missing course." }, { status: 400 });
  const subject = request.nextUrl.searchParams.get("subject") ?? "";
  const direct = request.nextUrl.searchParams.get("direct") === "1";
  const enrolled = await hasActiveEnrollment(user.uid, slug);
  if (!enrolled) return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
  try {
    if (subject && direct) {
      const contents = await getFlow4DirectContents(slug, subject);
      return NextResponse.json({ contents }, { headers: { "Cache-Control": "no-store" } });
    }
    if (subject && !direct) {
      // Legacy: return subjects so frontend can filter (kept for compatibility)
      const data = await getFlow4CourseData(slug);
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    if (direct) {
      const data = await getFlow4DirectCourseData(slug);
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    // Default: include both? Return direct when available for flow-4 layout, fallback to legacy
    // Try direct first; if has contents, prefer direct structure for new Flow 4
    try {
      const directData = await getFlow4DirectCourseData(slug);
      const hasDirect = directData.subjects.some((s) => s.contents.length > 0);
      if (hasDirect) return NextResponse.json({ subjects: directData.subjects, mode: "direct" } as unknown as object, { headers: { "Cache-Control": "no-store" } });
    } catch {}
    const data = await getFlow4CourseData(slug);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load course content." }, { status: 500 });
  }
}
