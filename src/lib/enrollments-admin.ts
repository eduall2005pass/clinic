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
  /** Payment details submitted by the student (paid enrollment) — verified MANUALLY by admin. */
  paymentTransactionId: string | null;
  paymentAmount: number | null;
  paymentSender: string | null;
};

export type EnrollmentListOptions = {
  search?: string;
  status?: "all" | EnrollmentStatus;
  courseId?: string;
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
  payment_transaction_id?: string | null;
  payment_amount?: string | number | null;
  payment_sender?: string | null;
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
    paymentTransactionId: row.payment_transaction_id ?? null,
    paymentAmount:
      row.payment_amount === null || row.payment_amount === undefined
        ? null
        : toNumber(row.payment_amount) || null,
    paymentSender: row.payment_sender ?? null,
  };
}

const SELECT_ENROLLMENTS = `
  SELECT e.id, e.student_uid, s.student_id, s.full_name, s.email,
         e.course_id, e.course_name, e.course_type, e.course_kind,
         e.fee, e.enrollment_status, e.enrollment_date, e.updated_at
  FROM enrollments e
  LEFT JOIN students s ON s.uid = e.student_uid`;

/** Payment columns (Step 3 migration) — absent on databases not yet migrated. */
const PAYMENT_COLUMNS = `,
         e.payment_transaction_id, e.payment_amount, e.payment_sender`;

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
  if (options.courseId && options.courseId.trim().length > 0) {
    conditions.push("e.course_id = ?");
    params.push(options.courseId.trim());
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    let rows: EnrollmentRow[];
    try {
      // Preferred — includes the payment details (Step 3 migration applied).
      rows = await query<EnrollmentRow[]>(
        `${SELECT_ENROLLMENTS}${PAYMENT_COLUMNS} ${whereClause} ORDER BY e.enrollment_date DESC LIMIT 500`,
        params,
      );
    } catch {
      // Payment columns not migrated yet — fall back to the base columns.
      rows = await query<EnrollmentRow[]>(
        `${SELECT_ENROLLMENTS} ${whereClause} ORDER BY e.enrollment_date DESC LIMIT 500`,
        params,
      );
    }
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

// ── Enrollment settings (Free Course auto-enrollment switch) ──────────────

export async function ensureEnrollmentSettingsTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS enrollment_settings (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      free_auto_enroll TINYINT(1) NOT NULL DEFAULT 1,
      bkash_number VARCHAR(40) NULL,
      nagad_number VARCHAR(40) NULL,
      payment_instructions TEXT NULL,
      updated_by VARCHAR(191) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

export type PaymentSettings = {
  freeAutoEnroll: boolean;
  bkashNumber: string | null;
  nagadNumber: string | null;
  paymentInstructions: string | null;
};

export async function getEnrollmentSettings(): Promise<PaymentSettings> {
  try {
    await ensureEnrollmentSettingsTable();
    const rows = await query<{
      free_auto_enroll: number;
      bkash_number: string | null;
      nagad_number: string | null;
      payment_instructions: string | null;
    }[]>(
      "SELECT free_auto_enroll, bkash_number, nagad_number, payment_instructions FROM enrollment_settings WHERE id = 'default' LIMIT 1",
    );
    // Defaults: auto-enrollment ON, empty payment card.
    if (rows.length === 0) {
      return { freeAutoEnroll: true, bkashNumber: null, nagadNumber: null, paymentInstructions: null };
    }
    const row = rows[0];
    return {
      freeAutoEnroll: row.free_auto_enroll === 1,
      bkashNumber: row.bkash_number,
      nagadNumber: row.nagad_number,
      paymentInstructions: row.payment_instructions,
    };
  } catch {
    return { freeAutoEnroll: true, bkashNumber: null, nagadNumber: null, paymentInstructions: null };
  }
}

/** Public view of the payment card shown to students during paid enrollment. */
export async function getPaymentCard(): Promise<
  { bkashNumber: string | null; nagadNumber: string | null; instructions: string | null }
> {
  const settings = await getEnrollmentSettings();
  return {
    bkashNumber: settings.bkashNumber,
    nagadNumber: settings.nagadNumber,
    instructions: settings.paymentInstructions,
  };
}

export async function setFreeAutoEnroll(
  enabled: boolean,
  adminUid: string,
): Promise<void> {
  await ensureEnrollmentSettingsTable();
  await exec(
    `INSERT INTO enrollment_settings (id, free_auto_enroll, updated_by)
     VALUES ('default', ?, ?)
     ON DUPLICATE KEY UPDATE free_auto_enroll = VALUES(free_auto_enroll), updated_by = VALUES(updated_by)`,
    [enabled ? 1 : 0, adminUid],
  );
}

// ── Enrollment Control — course list with pending application counts ──────

export type ControlCourse = {
  slug: string;
  name: string;
  category: string;
  kind: "free" | "paid";
  fee: number;
  pendingCount: number;
  totalApplications: number;
};

/** Every published catalog course + its per-course application counts. */
export async function fetchEnrollmentControlCourses(): Promise<ControlCourse[]> {
  const rows = await query<
    {
      slug: string;
      name: string;
      category: string | null;
      fee: number;
      pending_count: number;
      total: number;
    }[]
  >(
    `SELECT c.slug, c.name, c.category, c.fee,
            COALESCE(SUM(CASE WHEN e.enrollment_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
            COUNT(e.id) AS total
       FROM catalog_courses c
       LEFT JOIN enrollments e ON e.course_id = c.slug
      WHERE c.status = 'published'
      GROUP BY c.slug, c.name, c.category, c.fee
      ORDER BY c.sort_order ASC, c.name ASC`,
  );
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    category: row.category ?? "",
    kind: Number(row.fee) > 0 ? ("paid" as const) : ("free" as const),
    fee: Number(row.fee) || 0,
    pendingCount: Number(row.pending_count) || 0,
    totalApplications: Number(row.total) || 0,
  }));
}
