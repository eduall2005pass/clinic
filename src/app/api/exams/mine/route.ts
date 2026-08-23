import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { fetchExams, hasEnrolledExamAccess } from "@/lib/exams-admin";
import { deriveStatus } from "@/lib/public-exams";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/mine — published enrolled-kind exams the logged-in
 * student may take (enrolled in at least one assigned course).
 */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const exams = await fetchExams("enrolled");
  const available = [];
  for (const exam of exams) {
    if (exam.status !== "published") continue;
    if (!(await hasEnrolledExamAccess(exam.id, user.uid))) continue;
    available.push({
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      courseType: exam.courseType,
      totalMarks: exam.totalMarks,
      durationMinutes: exam.durationMinutes,
      scheduledAt: exam.scheduledAt,
      endsAt: exam.endsAt,
      status: deriveStatus(exam),
    });
  }

  return NextResponse.json(
    { exams: available },
    { headers: { "Cache-Control": "no-store" } },
  );
}
