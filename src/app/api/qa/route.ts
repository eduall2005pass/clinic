import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured, query } from "@/lib/mysql";
import {
  fetchQaBrowseSubjects,
  fetchQaQuestions,
  insertQaQuestion,
  matchCategoryId,
} from "@/lib/qa-store";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";

export const dynamic = "force-dynamic";

/** Public read: subjects + questions (per subject) for the website Q&A. */
export async function GET(request: NextRequest) {
  const subjectId =
    request.nextUrl.searchParams.get("subject")?.trim() ?? "";
  const [subjects, questions] = await Promise.all([
    fetchQaBrowseSubjects(),
    fetchQaQuestions(subjectId ? { subjectId } : {}),
  ]);
  return NextResponse.json(
    { subjects, questions },
    { headers: { "Cache-Control": "no-store" } },
  );
}

type AskBody = {
  categoryId?: unknown;
  courseId?: unknown;
  subjectId?: unknown;
  text?: unknown;
  imageUrl?: unknown;
};

function asTrimmedId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Ask a question — requires a signed-in student with an ACTIVE enrollment.
 * Every submission must carry a valid Category + Enrolled Course + Subject
 * triple, fully re-validated server-side:
 *   1. student is authenticated
 *   2. student has an active enrollment in the submitted course
 *   3. the course belongs to the submitted category
 *   4. the subject belongs to the submitted course
 *   5. the question content follows the existing text/picture rules
 * Audio submissions are rejected outright — audio questions are removed.
 */
export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to ask a question." },
      { status: 401 },
    );
  }
  if (!isMysqlConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: (AskBody & Record<string, unknown>) | null = null;
  body = (await request.json().catch(() => null)) as (AskBody &
    Record<string, unknown>) | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Audio question submission has been removed for students — reject any
  // attempt to smuggle audio payloads through the API.
  if ("audio" in body || "audioUrl" in body || "audioId" in body) {
    return NextResponse.json(
      { error: "Audio questions are no longer supported." },
      { status: 400 },
    );
  }

  const categoryId = asTrimmedId(body.categoryId);
  const courseId = asTrimmedId(body.courseId);
  const subjectId = asTrimmedId(body.subjectId);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

  if (!categoryId || !courseId || !subjectId) {
    return NextResponse.json(
      { error: "Select a category, your enrolled course and a subject." },
      { status: 400 },
    );
  }

  if (text.length < 5) {
    return NextResponse.json(
      { error: "Write your question (at least 5 characters)." },
      { status: 400 },
    );
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Question is too long (max 2000 characters)." },
      { status: 400 },
    );
  }
  if (imageUrl && !/^https:\/\/[^\s]+|^\/[^\s]+$/.test(imageUrl)) {
    return NextResponse.json(
      { error: "Invalid picture attachment." },
      { status: 400 },
    );
  }
  if (imageUrl.length > 1024) {
    return NextResponse.json(
      { error: "Picture attachment URL is too long." },
      { status: 400 },
    );
  }

  try {
    // (2) Active enrollment in the submitted course.
    const enrolled = await query<{ found: number }[]>(
      `SELECT 1 AS found FROM enrollments
        WHERE student_uid = ? AND course_id = ?
          AND enrollment_status = 'active' LIMIT 1`,
      [user.uid, courseId],
    );
    if (enrolled.length === 0) {
      return NextResponse.json(
        { error: "You can only ask about a course you are actively enrolled in." },
        { status: 403 },
      );
    }

    // (2b) Paid enrollment required — user must have at least one active paid course.
    const paidEnrolled = await query<{ found: number }[]>(
      `SELECT 1 AS found FROM enrollments
        WHERE student_uid = ? AND enrollment_status = 'active'
          AND course_kind = 'paid' LIMIT 1`,
      [user.uid],
    );
    if (paidEnrolled.length === 0) {
      return NextResponse.json(
        {
          error:
            "Asking questions is available only to students enrolled in a paid course. Please enroll in a paid course to ask questions.",
        },
        { status: 403 },
      );
    }

    // (3) Course belongs to the submitted category.
    const catalogRows = await query<{ category: string | null }[]>(
      "SELECT category FROM catalog_courses WHERE slug = ? LIMIT 1",
      [courseId],
    );
    if (catalogRows.length === 0) {
      return NextResponse.json(
        { error: "Unknown course." },
        { status: 400 },
      );
    }
    const categories = await fetchActiveCourseCategories();
    const resolvedCategoryId = matchCategoryId(
      categories,
      catalogRows[0].category,
    );
    const submittedCategory = categories.find((cat) => cat.id === categoryId);
    if (
      !submittedCategory ||
      !resolvedCategoryId ||
      resolvedCategoryId !== categoryId
    ) {
      return NextResponse.json(
        { error: "The selected course does not belong to that category." },
        { status: 400 },
      );
    }

    // (4) Subject belongs to the submitted course.
    const subjectRows = await query<{ found: number }[]>(
      `SELECT 1 AS found
         FROM course_subject_assignments a
         JOIN course_subjects s ON s.id = a.subject_id AND s.is_active = 1
        WHERE a.course_slug = ? AND s.id = ? LIMIT 1`,
      [courseId, subjectId],
    );
    if (subjectRows.length === 0) {
      return NextResponse.json(
        { error: "The selected subject does not belong to the selected course." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not verify your question context. Please try again." },
      { status: 500 },
    );
  }

  // Resolve a display name from the students table when available.
  let studentName = user.name ?? user.email?.split("@")[0] ?? "Student";
  try {
    const rows = await query<{ full_name: string | null }[]>(
      "SELECT full_name FROM students WHERE uid = ? LIMIT 1",
      [user.uid],
    );
    if (rows[0]?.full_name) studentName = rows[0].full_name;
  } catch {
    // keep token-derived name
  }

  const created = await insertQaQuestion({
    subjectId,
    categoryId,
    courseId,
    studentUid: user.uid,
    studentName,
    text,
    imageUrl: imageUrl || null,
  });
  if (!created) {
    return NextResponse.json(
      { error: "Failed to save your question. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ question: created }, { status: 201 });
}
