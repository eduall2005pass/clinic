import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchEnrollments } from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

/** ?examId=... — students enrolled in an exam (or all exams). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const examId = request.nextUrl.searchParams.get("examId") ?? undefined;
  const enrollments = await fetchEnrollments(examId || undefined);
  return NextResponse.json(
    { enrollments },
    { headers: { "Cache-Control": "no-store" } },
  );
}
