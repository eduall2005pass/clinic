import { query, exec } from "@/lib/mysql";
import { getCourse, getPayableFee } from "@/lib/courses";
import type { EnrollmentStatus } from "@/lib/enrollments";

export type AdminEnrollment = {
  id: number;
  studentUid: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  courseType: string;
  courseKind: "free" | "paid";
  fee: number;
  status: EnrollmentStatus;
  enrolledAt: number | null;
  updatedAt: number | null;
};

export type EnrollmentListOptions = {
  search?: string;
  status?: "all" | EnrollmentStatus;
};

type EnrollmentRow = {
  id: number | string;
  student_uid: string;
  student_id: string | null;
  full_name: string | null;
  email: string | null;
  course_id: string;
  course_name: string;
  course_type: string;
  course_kind: "free" | "paid";
  fee: number | string | null;
  enrollment_status: string;
  enrollment_date: Date | string | null;
  updated_at: Date | string | null;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTime(value: Date | string | null): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizeStatus(value: string): EnrollmentStatus {
  return value === "pending" ||
    value === "active" ||
    value === "cancelled" ||
    value === "completed"
    ? value
    : "pending";
}

function mapEnrollment(row: EnrollmentRow): AdminEnrollment {
  return {
    id: toNumber(row.id),
    studentUid: row.student_uid,
    studentId: row.student_id ?? "—",
    studentName: row.full_name ?? "Unknown student",
    studentEmail: row.email ?? "",
    courseId: row.course_id,
    courseName: row.course_name,
    courseType: row.course_type,
    courseKind: row.course_kind === "paid" ? "paid" : "free",
    fee: toNumber(row.fee),
    status: normalizeStatus(row.enrollment_status),
    enrolledAt: parseTime(row.enrollment_date),
    updatedAt: parseTime(row.updated_at),
  };
}

const SELECT_ENROLLMENTS = `
  SELECT e.id, e.student_uid, s.student_id, s.full_name, s.email,
         e.course_id, e.course_name, e.course_type, e.course_kind,
         e.fee, e.enrollment_status, e.enrollment_date, e.updated_at
  FROM enrollments e
  LEFT JOIN students s ON s.uid = e.student_uid`;

/** All enrollments with student info — supports search + status filter. */
export async function fetchEnrollmentsAdmin(
  options: EnrollmentListOptions = {},
): Promise<AdminEnrollment[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.search && options.search.trim().length > 0) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      "(s.full_name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR e.course_name LIKE ? OR e.course_id LIKE ?)",
    );
    params.push(term, term, term, term, term);
  }
  if (options.status && options.status !== "all") {
    conditions.push("e.enrollment_status = ?");
    params.push(options.status);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const rows = await query<EnrollmentRow[]>(
      `${SELECT_ENROLLMENTS} ${whereClause} ORDER BY e.enrollment_date DESC LIMIT 500`,
      params,
    );
    return rows.map(mapEnrollment);
  } catch {
    return [];
  }
}

/** Approve / cancel / complete an enrollment. */
export async function setEnrollmentStatus(
  id: number,
  status: EnrollmentStatus,
): Promise<boolean> {
  try {
    const result = await exec(
      "UPDATE enrollments SET enrollment_status = ? WHERE id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  } catch {
    return false;
  }
}

/**
 * Assign a course to a student (admin grant). Creates the enrollment or
 * re-activates an existing/cancelled one. Course data comes from the static
 * catalog so name/type/kind/fee stay consistent.
 */
export async function assignCourseToStudent(
  studentUid: string,
  courseId: string,
): Promise<{ ok: boolean; error?: string }> {
  const course = getCourse(courseId);
  if (!course) {
    return { ok: false, error: "Unknown course." };
  }

  const courseKind = course.fee > 0 ? "paid" : "free";
  const fee = getPayableFee(course);

  try {
    await query("INSERT IGNORE INTO courses (course_id, kind) VALUES (?, ?)", [
      course.slug,
      courseKind,
    ]);
    await query(
      `INSERT INTO enrollments
        (student_uid, course_id, course_name, course_type, course_kind,
         fee, enrollment_status, enrollment_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         course_name = VALUES(course_name),
         course_type = VALUES(course_type),
         course_kind = VALUES(course_kind),
         fee = VALUES(fee),
         enrollment_status = 'active'`,
      [
        studentUid,
        course.slug,
        course.name,
        course.category,
        courseKind,
        fee,
      ],
    );
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to assign the course." };
  }
}

/** Permanently remove a course access record. */
export async function deleteEnrollment(id: number): Promise<boolean> {
  try {
    const result = await exec("DELETE FROM enrollments WHERE id = ?", [id]);
    return result.affectedRows > 0;
  } catch {
    return false;
  }
}
