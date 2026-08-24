import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { getStudentExamResultDetail } from "@/lib/my-exam-results";

export const dynamic = "force-dynamic";

/**
 * GET — one exam's detailed result for the logged-in student.
 * The query filters on student_uid, so result ownership is enforced
 * server-side: another student's result can never be read by changing IDs.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ examId: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { examId } = await context.params;
  const detail = await getStudentExamResultDetail(
    user.uid,
    decodeURIComponent(examId),
  );
  if (!detail) {
    return NextResponse.json(
      { error: "Result not found for this exam." },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { result: detail },
    { headers: { "Cache-Control": "no-store" } },
  );
}
