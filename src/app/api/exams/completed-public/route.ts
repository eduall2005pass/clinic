import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/completed-public — list of public exam IDs where the
 * current student already has a completed attempt (exam_results row).
 * Used to render View Result instead of Start Exam on list cards and detail pages.
 * Strictly for public exams (kind != 'enrolled'); enrolled exams are not included.
 */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await query<{ exam_id: string }[]>(
      `SELECT r.exam_id FROM exam_results r
       JOIN exams e ON e.id = r.exam_id
       WHERE r.student_uid = ? AND e.kind != 'enrolled'
       GROUP BY r.exam_id`,
      [user.uid],
    );
    const examIds = rows.map((r) => r.exam_id);
    return NextResponse.json({ completed: examIds }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ completed: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
