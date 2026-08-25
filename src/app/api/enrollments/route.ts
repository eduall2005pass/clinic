import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query, exec, parseDate, isMysqlConfigured } from "@/lib/mysql";
import type { Enrollment } from "@/lib/enrollments";
import { validateCoupon, computeDiscountedFee, incrementCouponUsage } from "@/lib/coupons";
import { getEnrollmentSettings } from "@/lib/enrollments-admin";

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
  } | null;
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const courseName =
    typeof body?.courseName === "string" ? body.courseName : courseId;
  const courseType = body?.courseType === "Admission" ? "Admission" : "Academic";
  const fee = typeof body?.fee === "number" && body.fee > 0 ? body.fee : 0;
  const rawCouponCode =
    typeof body?.couponCode === "string" ? body.couponCode.trim() : "";
  if (!courseId) {
    return NextResponse.json(
      { error: "Missing course id." },
      { status: 400 },
    );
  }

  // Coupons are always re-validated server-side — the client-side check is
  // cosmetic only and must never be trusted for pricing.
  let appliedCouponCode: string | null = null;
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
    return NextResponse.json({ enrollment: mapEnrollment(rows[0]) });
  } catch {
    return NextResponse.json(
      { error: "Could not complete the enrollment." },
      { status: 500 },
    );
  }
}
