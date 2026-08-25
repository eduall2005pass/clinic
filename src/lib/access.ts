import { query } from "@/lib/mysql";

// ── MediSpark User Access & Permission System (server-side) ───────────────
//
// 4 levels:
//   guest      → not logged in (public content only)
//   registered → logged in with a completed student profile, no enrollment
//   free       → active enrollment in at least one FREE course
//   paid       → active enrollment in at least one PAID course (unlocks Q&A)
//
// Course-wise enforcement is always per course: every protected request must
// be checked against the CALLING user's uid + the REQUESTED course id.

export type AccessLevel = "guest" | "registered" | "free" | "paid";

export type ActiveEnrollment = {
  courseId: string;
  kind: "free" | "paid";
};

/** All ACTIVE enrollments of one student (course-wise permission source). */
export async function getActiveEnrollments(
  uid: string,
): Promise<ActiveEnrollment[]> {
  const rows = await query<{ course_id: string; course_kind: string }[]>(
    `SELECT course_id, course_kind FROM enrollments
      WHERE student_uid = ? AND enrollment_status = 'active'`,
    [uid],
  );
  return rows.map((row) => ({
    courseId: row.course_id,
    kind: row.course_kind === "paid" ? "paid" : "free",
  }));
}

/**
 * The student's overall level. Registered = profile exists but nothing
 * enrolled (the caller decides that); here we only classify enrollments.
 */
export async function getAccessLevel(
  uid: string,
  hasProfile = true,
): Promise<AccessLevel> {
  const enrollments = await getActiveEnrollments(uid);
  if (enrollments.length === 0) return hasProfile ? "registered" : "guest";
  return enrollments.some((enrollment) => enrollment.kind === "paid")
    ? "paid"
    : "free";
}

/** Q&A is available ONLY to students with an active PAID course. */
export async function hasPaidEnrollment(uid: string): Promise<boolean> {
  const enrollments = await getActiveEnrollments(uid);
  return enrollments.some((enrollment) => enrollment.kind === "paid");
}

/** Course-wise protected-content check: this uid + THIS course only. */
export async function canAccessCourseContent(
  uid: string,
  courseId: string,
): Promise<boolean> {
  if (!courseId) return false;
  const rows = await query<{ found: number }[]>(
    `SELECT 1 AS found FROM enrollments
      WHERE student_uid = ? AND course_id = ? AND enrollment_status = 'active'
      LIMIT 1`,
    [uid, courseId],
  );
  return rows.length > 0;
}

/**
 * Whether a class/material/exam item belongs to a course the student is
 * actively enrolled in. Used to validate item-level requests (favourites,
 * progress, view history) so IDs cannot point outside the enrollment.
 */
export async function itemInEnrolledCourse(
  uid: string,
  itemType: "class" | "material" | "exam",
  itemId: string,
): Promise<boolean> {
  if (!itemId || itemId.length > 64) return false;
  try {
    let rows: { found: number }[] = [];
    if (itemType === "exam") {
      rows = await query<{ found: number }[]>(
        `SELECT 1 AS found
           FROM exams ex
           JOIN course_chapters ch ON ch.id = ex.chapter_id
           JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
           JOIN enrollments e ON e.course_id = a.course_slug
                AND e.student_uid = ? AND e.enrollment_status = 'active'
          WHERE ex.id = ? LIMIT 1`,
        [uid, itemId],
      );
    } else {
      const table =
        itemType === "class" ? "course_classes cl" : "course_materials m";
      rows = await query<{ found: number }[]>(
        `SELECT 1 AS found
           FROM ${table}
           JOIN course_chapters ch ON ch.id = ${
             itemType === "class" ? "cl.chapter_id" : "m.chapter_id"
           }
           JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
           JOIN enrollments e ON e.course_id = a.course_slug
                AND e.student_uid = ? AND e.enrollment_status = 'active'
          WHERE ${itemType === "class" ? "cl.id" : "m.id"} = ? LIMIT 1`,
        [uid, itemId],
      );
    }
    return rows.length > 0;
  } catch {
    // On DB failure deny — never fail open.
    return false;
  }
}
