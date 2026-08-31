import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { getExamForTaking } from "@/lib/exam-taking";
import { hasActiveEnrollment } from "@/lib/my-learning";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

/**
 * GET /api/my/courses/[slug]/exams/[examId]
 *
 * Course-contextualized exam access. Server-side verifies:
 * 1. Student is authenticated
 * 2. Student is enrolled in the course
 * 3. Exam belongs to the course (via exam_courses or chapter_id)
 * 4. Exam is published
 * 5. Exam is currently available (time window)
 * 6. Student satisfies attempt rules
 *
 * ?start=1 begins the attempt (after rules acceptance).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; examId: string }> },
) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug, examId } = await context.params;

  // 1. Verify student is enrolled in this course
  const enrolled = await hasActiveEnrollment(user.uid, slug);
  if (!enrolled) {
    return NextResponse.json(
      { error: "You are not enrolled in this course." },
      { status: 403 },
    );
  }

  // 2. Verify exam belongs to this course
  const belongsToCourse = await examBelongsToCourse(examId, slug);
  if (!belongsToCourse) {
    return NextResponse.json(
      { error: "This exam does not belong to this course." },
      { status: 404 },
    );
  }

  // 3. Load exam via the existing engine (handles published check, time window,
  //    question loading, attempt rules, session management)
  const startAttempt = request.nextUrl.searchParams.get("start") === "1";
  const payload = await getExamForTaking(
    examId,
    user.uid,
    user.name || user.email || "Student",
    startAttempt,
  );

  if (!payload) {
    return NextResponse.json(
      { error: "Exam not found or not available." },
      { status: 404 },
    );
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Check whether an exam belongs to a course via:
 * - exam_courses table (direct assignment), OR
 * - exam.chapter_id → course_chapters → course_subject_assignments.course_slug
 */
async function examBelongsToCourse(
  examId: string,
  courseSlug: string,
): Promise<boolean> {
  try {
    // Check exam_courses first (direct assignment)
    const direct = await query<{ found: number }[]>(
      `SELECT 1 AS found FROM exam_courses
       WHERE exam_id = ? AND course_id = ?
       LIMIT 1`,
      [examId, courseSlug],
    );
    if (direct.length > 0) return true;

    // Check chapter_id chain: exam → chapter → subject assignment → course
    const viaChapter = await query<{ found: number }[]>(
      `SELECT 1 AS found FROM exams ex
       JOIN course_chapters ch ON ch.id = ex.chapter_id
       JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
       WHERE ex.id = ? AND a.course_slug = ?
       LIMIT 1`,
      [examId, courseSlug],
    );
    return viaChapter.length > 0;
  } catch {
    return false;
  }
}
