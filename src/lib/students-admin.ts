import { query } from "@/lib/mysql";

export type AdminStudent = {
  uid: string;
  studentId: string;
  fullName: string;
  gender: string;
  institution: string;
  hscBatch: string;
  contactNumber: string;
  email: string;
  facebookUrl: string | null;
  profilePictureUrl: string | null;
  provider: string;
  isActive: boolean;
  createdAt: number | null;
  enrollmentCount: number;
};

export type StudentEnrollmentInfo = {
  courseId: string;
  courseName: string;
  courseType: string;
  courseKind: "free" | "paid";
  fee: number;
  status: string;
  enrolledAt: number | null;
};

type StudentRow = {
  uid: string;
  student_id: string;
  full_name: string;
  gender: string;
  institution: string;
  hsc_batch: string;
  contact_number: string;
  email: string;
  facebook_url: string | null;
  profile_picture_url: string | null;
  provider: string;
  is_active?: number | boolean | null;
  created_at: Date | string | null;
  enrollment_count?: number | string | null;
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

function mapStudent(row: StudentRow): AdminStudent {
  return {
    uid: row.uid,
    studentId: row.student_id,
    fullName: row.full_name,
    gender: row.gender,
    institution: row.institution,
    hscBatch: row.hsc_batch,
    contactNumber: row.contact_number ?? "",
    email: row.email ?? "",
    facebookUrl: row.facebook_url ?? null,
    profilePictureUrl: row.profile_picture_url ?? null,
    // Protected authentication fields (uid/provider) are exposed read-only.
    provider: row.provider,
    isActive: row.is_active === undefined || row.is_active === null ? true : Boolean(row.is_active),
    createdAt: parseTime(row.created_at),
    enrollmentCount: toNumber(row.enrollment_count),
  };
}

export type StudentListOptions = {
  search?: string;
  status?: "all" | "active" | "deactivated";
};

export async function fetchStudents(
  options: StudentListOptions = {},
): Promise<AdminStudent[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.search && options.search.trim().length > 0) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      "(full_name LIKE ? OR student_id LIKE ? OR email LIKE ? OR contact_number LIKE ?)",
    );
    params.push(term, term, term, term);
  }
  if (options.status === "active") {
    conditions.push("(is_active IS NULL OR is_active = 1)");
  } else if (options.status === "deactivated") {
    conditions.push("is_active = 0");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const rows = await query<StudentRow[]>(
      `SELECT s.uid, s.student_id, s.full_name, s.gender, s.institution, s.hsc_batch,
              s.contact_number, s.email, s.facebook_url, s.profile_picture_url,
              s.provider, s.is_active, s.created_at,
              (SELECT COUNT(*) FROM enrollments e WHERE e.student_uid = s.uid) AS enrollment_count
       FROM students s ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT 500`,
      params,
    );
    return rows.map(mapStudent);
  } catch {
    // is_active column may not be migrated yet — retry without status filter columns.
    try {
      const rows = await query<StudentRow[]>(
        `SELECT s.uid, s.student_id, s.full_name, s.gender, s.institution, s.hsc_batch,
                s.contact_number, s.email, s.facebook_url, s.profile_picture_url,
                s.provider, s.created_at,
                (SELECT COUNT(*) FROM enrollments e WHERE e.student_uid = s.uid) AS enrollment_count
         FROM students s
         ORDER BY s.created_at DESC
         LIMIT 500`,
      );
      return rows.map(mapStudent);
    } catch {
      return [];
    }
  }
}

export async function fetchStudentDetail(uid: string): Promise<{
  student: AdminStudent;
  enrollments: StudentEnrollmentInfo[];
} | null> {
  try {
    const rows = await query<StudentRow[]>(
      `SELECT uid, student_id, full_name, gender, institution, hsc_batch,
              contact_number, email, facebook_url, profile_picture_url,
              provider, is_active, created_at
       FROM students WHERE uid = ? LIMIT 1`,
      [uid],
    );
    if (!rows[0]) return null;

    let enrollments: StudentEnrollmentInfo[] = [];
    try {
      const enrollmentRows = await query<
        {
          course_id: string;
          course_name: string;
          course_type: string;
          course_kind: "free" | "paid";
          fee: number;
          enrollment_status: string;
          enrollment_date: Date | string;
        }[]
      >(
        `SELECT course_id, course_name, course_type, course_kind, fee, enrollment_status, enrollment_date
         FROM enrollments WHERE student_uid = ? ORDER BY enrollment_date DESC`,
        [uid],
      );
      enrollments = enrollmentRows.map((row) => ({
        courseId: row.course_id,
        courseName: row.course_name,
        courseType: row.course_type,
        courseKind: row.course_kind,
        fee: toNumber(row.fee),
        status: row.enrollment_status,
        enrolledAt: parseTime(row.enrollment_date),
      }));
    } catch {
      enrollments = [];
    }

    return { student: mapStudent(rows[0]), enrollments };
  } catch {
    return null;
  }
}

/** Toggle account activation. Protected credentials are never touched. */
export async function setStudentActive(
  uid: string,
  isActive: boolean,
): Promise<boolean> {
  try {
    await query(
      "UPDATE students SET is_active = ? WHERE uid = ?",
      [isActive ? 1 : 0, uid],
    );
    return true;
  } catch {
    return false;
  }
}
