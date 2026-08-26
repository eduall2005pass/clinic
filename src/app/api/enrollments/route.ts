import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query, exec, parseDate, isMysqlConfigured } from "@/lib/mysql";
import type { Enrollment } from "@/lib/enrollments";
import { validateCoupon, computeDiscountedFee, incrementCouponUsage } from "@/lib/coupons";
import { getEnrollmentSettings } from "@/lib/enrollments-admin";
import {
  createEnrollmentApplication,
  findApplicationByTransaction,
  findPendingApplication,
  APPLICATION_PENDING,
} from "@/lib/enrollment-applications";
import { getCourse } from "@/lib/courses";
import { getLiveCourses } from "@/lib/course-catalog";

export const dynamic = "force-dynamic";

type EnrollmentRow = {
  student_uid: string;
  course_id: string;
  course_name: string;
  course_type: "Academic" | "Admission";
  course_kind: "free" | "paid";
  fee: number;
  enrollment_status: "pending" | "active" | "cancelled" | "completed";
  enrollment_date: Date | string;
  updated_at: Date | string;
};

function mapEnrollment(row: EnrollmentRow): Enrollment {
  return {
    studentUid: row.student_uid,
    courseId: row.course_id,
    courseName: row.course_name,
    courseType: row.course_type,
    courseKind: row.course_kind,
    fee: row.fee,
    enrollmentStatus: row.enrollment_status,
    enrollmentDate: parseDate(row.enrollment_date),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ enrollments: [] });
  }
  try {
    const rows = await query<EnrollmentRow[]>(
      "SELECT * FROM enrollments WHERE student_uid = ? ORDER BY updated_at DESC",
      [user.uid],
    );
    return NextResponse.json({
      enrollments: rows.map(mapEnrollment),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load enrollments." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    courseId?: unknown;
    courseName?: unknown;
    courseType?: unknown;
    courseKind?: unknown;
    fee?: unknown;
    couponCode?: unknown;
    transactionId?: unknown;
    senderMobile?: unknown;
    paidAmount?: unknown;
  } | null;
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const courseName =
    typeof body?.courseName === "string" ? body.courseName : courseId;
  const courseType = body?.courseType === "Admission" ? "Admission" : "Academic";
  const fee = typeof body?.fee === "number" && body.fee > 0 ? body.fee : 0;
  const rawCouponCode =
    typeof body?.couponCode === "string" ? body.couponCode.trim() : "";
  // Step 4 — paid-course payment proof.
  const transactionId =
    typeof body?.transactionId === "string" ? body.transactionId.trim() : "";
  const senderMobile =
    typeof body?.senderMobile === "string" ? body.senderMobile.trim() : "";
  const paidAmountRaw = body?.paidAmount;
  if (!courseId) {
    return NextResponse.json(
      { error: "Missing course id." },
      { status: 400 },
    );
  }

  // Coupons are always re-validated server-side — the client-side check is
  // cosmetic only and must never be trusted for pricing.
  let appliedCouponCode: string | null = null;
  let paidAmount = NaN;
  let finalFee = fee;
  if (rawCouponCode && fee > 0) {
    const result = await validateCoupon(rawCouponCode);
    if (result.error || !result.coupon) {
      return NextResponse.json(
        { error: result.error ?? "Invalid coupon code." },
        { status: 400 },
      );
    }
    finalFee = computeDiscountedFee(result.coupon, fee);
    appliedCouponCode = result.coupon.code;
  }

  // ── Step 4: paid-course application validation ─────────────────────────
  // A paid submission must carry complete, valid payment proof and stays
  // pending_validation until an admin takes action. Nothing auto-approves.
  let studentId = "";
  let studentEmail = user.email ?? "";
  if (finalFee > 0) {
    // 1) Student must be registered (row in students table).
    try {
      const studentRows = await query<
        { student_id: string; email: string }[]
      >("SELECT student_id, email FROM students WHERE uid = ? LIMIT 1", [
        user.uid,
      ]);
      if (!studentRows[0]) {
        return NextResponse.json(
          { error: "Complete your registration before enrolling." },
          { status: 403 },
        );
      }
      studentId = studentRows[0].student_id;
      studentEmail = studentRows[0].email || studentEmail;
    } catch {
      return NextResponse.json(
        { error: "Could not verify your registration. Please try again." },
        { status: 500 },
      );
    }

    // 2) Course must exist (static catalog or live catalog_courses table).
    const inCatalog = getCourse(courseId)
      ? true
      : await query<{ one: number }[]>(
          "SELECT 1 AS one FROM catalog_courses WHERE slug = ? LIMIT 1",
          [courseId],
        ).then((rows) => rows.length > 0)
        .catch(() => false);
    if (!inCatalog) {
      return NextResponse.json(
        { error: "Unknown course." },
        { status: 400 },
      );
    }

    // 3) Student must not already be actively enrolled.
    const activeRows = await query<{ one: number }[]>(
      "SELECT 1 AS one FROM enrollments WHERE student_uid = ? AND course_id = ? AND enrollment_status = 'active' LIMIT 1",
      [user.uid, courseId],
    );
    if (activeRows.length > 0) {
      return NextResponse.json(
        { error: "You are already enrolled in this course." },
        { status: 409 },
      );
    }

    // 4) Required payment information + format validation.
    if (!transactionId || transactionId.length < 4 || transactionId.length > 64) {
      return NextResponse.json(
        { error: "A valid Transaction ID (4–64 characters) is required." },
        { status: 400 },
      );
    }
    paidAmount =
      typeof paidAmountRaw === "number"
        ? paidAmountRaw
        : typeof paidAmountRaw === "string" && paidAmountRaw.trim() !== ""
          ? Number(paidAmountRaw)
          : NaN;
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount > 1_000_000) {
      return NextResponse.json(
        { error: "Enter a valid Paid Amount greater than 0." },
        { status: 400 },
      );
    }
    if (!/^01[3-9]\d{8}$/.test(senderMobile)) {
      return NextResponse.json(
        { error: "Enter a valid Sender Mobile Number (e.g. 01XXXXXXXXX)." },
        { status: 400 },
      );
    }

    // 5) Transaction ID must not already be used by any application.
    const existingTxn = await findApplicationByTransaction(transactionId);
    if (existingTxn) {
      return NextResponse.json(
        { error: "This Transaction ID has already been submitted." },
        { status: 409 },
      );
    }

    // 6) One pending application per student per course at a time.
    const pendingSameCourse = await findPendingApplication(user.uid, courseId);
    if (pendingSameCourse) {
      return NextResponse.json(
        {
          error:
            "You already have a pending application for this course. Please wait for validation.",
        },
        { status: 409 },
      );
    }
  }

  await query("INSERT IGNORE INTO courses (course_id, kind) VALUES (?, ?)", [
    courseId,
    finalFee > 0 ? "paid" : "free",
  ]);

  // Free Course auto-enrollment can be switched off from Enrollment Control;
  // when disabled, free enrollments wait for admin approval like paid ones.
  let enrollmentStatus: Enrollment["enrollmentStatus"] =
    finalFee > 0 ? "pending" : "active";
  if (finalFee <= 0) {
    const settings = await getEnrollmentSettings();
    if (!settings.freeAutoEnroll) {
      enrollmentStatus = "pending";
    }
  }

  const now = new Date().toISOString();
  const enrollment: Enrollment = {
    studentUid: user.uid,
    courseId,
    courseName,
    courseType,
    courseKind: finalFee > 0 ? "paid" : "free",
    fee: finalFee,
    enrollmentStatus,
    enrollmentDate: now,
    updatedAt: now,
  };
  try {
    const result = await exec(
      `INSERT INTO enrollments
        (student_uid, course_id, course_name, course_type, course_kind,
         fee, enrollment_status, enrollment_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         course_name = VALUES(course_name),
         course_type = VALUES(course_type),
         course_kind = VALUES(course_kind),
         fee = VALUES(fee),
         enrollment_date = NOW(),
         updated_at = NOW(),
         -- Never downgrade an active enrollment; re-enrolling revives
         -- cancelled/completed/pending rows instead of being ignored.
         enrollment_status = IF(enrollment_status = 'active', 'active',
                                VALUES(enrollment_status))`,
      [
        user.uid,
        courseId,
        courseName,
        courseType,
        enrollment.courseKind,
        finalFee,
        enrollment.enrollmentStatus,
      ],
    );
    // Read back the authoritative row so the client always sees the real
    // stored status (new or revived) without needing manual DB entry.
    const rows = await query<EnrollmentRow[]>(
      "SELECT * FROM enrollments WHERE student_uid = ? AND course_id = ? LIMIT 1",
      [user.uid, courseId],
    );
    if (!rows[0]) {
      return NextResponse.json(
        { error: "Could not complete the enrollment." },
        { status: 500 },
      );
    }
    // Coupon usage counts only for a newly created enrollment.
    if (result.affectedRows === 1 && appliedCouponCode) {
      await incrementCouponUsage(appliedCouponCode);
    }

    // Step 4 — record the paid-course enrollment application
    // (status: pending_validation) alongside the pending enrollment row.
    let application = null;
    if (finalFee > 0) {
      try {
        application = await createEnrollmentApplication({
          studentUid: user.uid,
          studentId,
          studentEmail,
          courseId,
          courseName,
          transactionId,
          paidAmount: Number(paidAmount),
          senderMobile,
          couponCode: appliedCouponCode,
        });
      } catch {
        // Most likely a duplicated transaction id raced in between the
        // check and the insert — surface it as a validation error.
        return NextResponse.json(
          { error: "This Transaction ID has already been submitted." },
          { status: 409 },
        );
      }
      // Mirror the payment proof onto the enrollment row so the Admin
      // Pending Applications card shows TxID / Paid Amount / Sender Mobile
      // for manual verification. Best-effort — the columns may not exist on
      // databases where the Step 3 migration has not been applied yet.
      try {
        await exec(
          `UPDATE enrollments SET payment_transaction_id = ?, payment_amount = ?, payment_sender = ?
           WHERE student_uid = ? AND course_id = ?`,
          [transactionId, Number(paidAmount), senderMobile, user.uid, courseId],
        );
      } catch {
        // Migration pending — admin UI falls back gracefully.
      }
    }

    return NextResponse.json({
      enrollment: mapEnrollment(rows[0]),
      ...(application ? { application } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not complete the enrollment." },
      { status: 500 },
    );
  }
}
