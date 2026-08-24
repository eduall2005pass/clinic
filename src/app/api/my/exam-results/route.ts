import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { getStudentExamResultGroups } from "@/lib/my-exam-results";

export const dynamic = "force-dynamic";

/** GET — the logged-in student's exam results, grouped course-wise. */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const groups = await getStudentExamResultGroups(user.uid);
  return NextResponse.json(
    { groups },
    { headers: { "Cache-Control": "no-store" } },
  );
}
