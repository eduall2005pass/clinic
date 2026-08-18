import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { supabaseServer } from "@/lib/supabase";
import type { Enrollment } from "@/lib/enrollments";

export const dynamic = "force-dynamic";

type EnrollmentRow = {
  student_uid: string;
  course_id: string;
  course_name: string;
  course_type: "Academic" | "Admission";
  course_kind: "free" | "paid";
  fee: number;
  enrollment_status: "pending" | "active" | "cancelled" | "completed";
  enrollment_date: string;
  updated_at: string;
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
    enrollmentDate: row.enrollment_date,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !supabaseServer) {
    return NextResponse.json({ enrollments: [] });
  }
  const { data, error } = await supabaseServer
    .from("enrollments")
    .select("*")
    .eq("student_uid", user.uid)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Could not load enrollments." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    enrollments: (data ?? []).map((row) => mapEnrollment(row as EnrollmentRow)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseServer) {
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
  } | null;
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const courseName =
    typeof body?.courseName === "string" ? body.courseName : courseId;
  const courseType = body?.courseType === "Admission" ? "Admission" : "Academic";
  const fee =
    typeof body?.fee === "number" && body.fee > 0 ? body.fee : 0;
  if (!courseId) {
    return NextResponse.json(
      { error: "Missing course id." },
      { status: 400 },
    );
  }

  await supabaseServer.from("courses").upsert(
    { course_id: courseId, kind: fee > 0 ? "paid" : "free" },
    { onConflict: "course_id", ignoreDuplicates: true },
  );

  const now = new Date().toISOString();
  const enrollment: Enrollment = {
    studentUid: user.uid,
    courseId,
    courseName,
    courseType,
    courseKind: fee > 0 ? "paid" : "free",
    fee,
    enrollmentStatus: fee > 0 ? "pending" : "active",
    enrollmentDate: now,
    updatedAt: now,
  };
  const { data, error } = await supabaseServer
    .from("enrollments")
    .upsert(
      {
        student_uid: user.uid,
        course_id: courseId,
        course_name: courseName,
        course_type: courseType,
        course_kind: enrollment.courseKind,
        fee,
        enrollment_status: enrollment.enrollmentStatus,
        enrollment_date: now,
        updated_at: now,
      },
      { onConflict: "student_uid,course_id", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "Could not complete the enrollment." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    enrollment: data
      ? mapEnrollment(data as EnrollmentRow)
      : enrollment,
  });
}