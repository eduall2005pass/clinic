import { query, exec, isMysqlConfigured } from "@/lib/mysql";

/**
 * Step 4 — Paid Course enrollment applications.
 *
 * When a registered student submits a paid-course enrollment with
 * Transaction ID / Paid Amount / Sender Mobile, a row is created here with
 * application_status = 'pending_validation'. The record stays pending until
 * an admin takes action (accept/reject UI comes later). Nothing in this
 * flow ever auto-approves a paid course.
 */

export const APPLICATION_PENDING = "pending_validation";

export type EnrollmentApplication = {
  id: number;
  studentUid: string;
  studentId: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  transactionId: string;
  paidAmount: number;
  senderMobile: string;
  applicationStatus: string;
  couponCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApplicationRow = {
  id: number | string;
  student_uid: string;
  student_id: string | null;
  student_email: string | null;
  course_id: string;
  course_name: string;
  transaction_id: string;
  paid_amount: string | number;
  sender_mobile: string;
  application_status: string;
  coupon_code: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapApplication(row: ApplicationRow): EnrollmentApplication {
  return {
    id: Number(row.id),
    studentUid: row.student_uid,
    studentId: row.student_id ?? "",
    studentEmail: row.student_email ?? "",
    courseId: row.course_id,
    courseName: row.course_name,
    transactionId: row.transaction_id,
    paidAmount: Number(row.paid_amount),
    senderMobile: row.sender_mobile,
    applicationStatus: row.application_status,
    couponCode: row.coupon_code ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function ensureTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS enrollment_applications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      student_uid VARCHAR(191) NOT NULL,
      student_id VARCHAR(32) NOT NULL DEFAULT '',
      student_email VARCHAR(255) NOT NULL DEFAULT '',
      course_id VARCHAR(191) NOT NULL,
      course_name VARCHAR(255) NOT NULL,
      transaction_id VARCHAR(64) NOT NULL,
      paid_amount DECIMAL(10,2) NOT NULL,
      sender_mobile VARCHAR(32) NOT NULL,
      application_status VARCHAR(32) NOT NULL DEFAULT 'pending_validation',
      coupon_code VARCHAR(64) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY enrollment_applications_txn_unique (transaction_id),
      KEY idx_enrollment_applications_student_course (student_uid, course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

export async function findApplicationByTransaction(
  transactionId: string,
): Promise<EnrollmentApplication | null> {
  await ensureTable();
  const rows = await query<ApplicationRow[]>(
    "SELECT * FROM enrollment_applications WHERE transaction_id = ? LIMIT 1",
    [transactionId],
  );
  return rows[0] ? mapApplication(rows[0]) : null;
}

export async function findPendingApplication(
  studentUid: string,
  courseId: string,
): Promise<EnrollmentApplication | null> {
  await ensureTable();
  const rows = await query<ApplicationRow[]>(
    `SELECT * FROM enrollment_applications
     WHERE student_uid = ? AND course_id = ? AND application_status = ?
     ORDER BY created_at DESC LIMIT 1`,
    [studentUid, courseId, APPLICATION_PENDING],
  );
  return rows[0] ? mapApplication(rows[0]) : null;
}

/** Create the pending-validation application record for a paid course. */
export async function createEnrollmentApplication(input: {
  studentUid: string;
  studentId: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  transactionId: string;
  paidAmount: number;
  senderMobile: string;
  couponCode?: string | null;
}): Promise<EnrollmentApplication> {
  await ensureTable();
  const result = await exec(
    `INSERT INTO enrollment_applications
      (student_uid, student_id, student_email, course_id, course_name,
       transaction_id, paid_amount, sender_mobile, application_status, coupon_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.studentUid,
      input.studentId,
      input.studentEmail,
      input.courseId,
      input.courseName,
      input.transactionId,
      input.paidAmount,
      input.senderMobile,
      APPLICATION_PENDING,
      input.couponCode ?? null,
    ],
  );
  const id = Number(result.insertId);
  const rows = await query<ApplicationRow[]>(
    "SELECT * FROM enrollment_applications WHERE id = ? LIMIT 1",
    [id],
  );
  if (!rows[0]) {
    throw new Error("Failed to create the enrollment application.");
  }
  return mapApplication(rows[0]);
}
