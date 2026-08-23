import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchEnrollmentsAdmin,
  setEnrollmentStatus,
  assignCourseToStudent,
  deleteEnrollment,
} from "@/lib/enrollments-admin";
import type { EnrollmentStatus } from "@/lib/enrollments";
import { logAdminAction } from "@/lib/administration";

export const dynamic = "force-dynamic";

const STATUSES: EnrollmentStatus[] = [
  "pending",
  "active",
  "cancelled",
  "completed",
];

/** List enrollments (search + status filter). */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (STATUSES as string[]).includes(statusParam)
      ? (statusParam as EnrollmentStatus)
      : "all";

  const enrollments = await fetchEnrollmentsAdmin({ search, status });
  return NextResponse.json({ enrollments });
}

/** Assign a course to a student. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    studentUid?: unknown;
    courseId?: unknown;
  } | null;

  if (
    typeof body?.studentUid !== "string" ||
    body.studentUid.trim().length === 0
  ) {
    return NextResponse.json({ error: "Missing student." }, { status: 400 });
  }
  if (typeof body?.courseId !== "string" || body.courseId.trim().length === 0) {
    return NextResponse.json({ error: "Missing course." }, { status: 400 });
  }

  const result = await assignCourseToStudent(
    body.studentUid.trim(),
    body.courseId.trim(),
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to assign the course." },
      { status: 400 },
    );
  }
    await logAdminAction(admin, "enrollment.save", String(body.studentUid), request);
return NextResponse.json({ message: "Course assigned and activated." });
}

/** Approve / cancel / complete an enrollment. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    status?: unknown;
  } | null;

  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Missing enrollment id." }, { status: 400 });
  }
  if (typeof body?.status !== "string" || !(STATUSES as string[]).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const success = await setEnrollmentStatus(id, body.status as EnrollmentStatus);
  if (!success) {
    return NextResponse.json(
      { error: "Failed to update the enrollment." },
      { status: 500 },
    );
  }
    await logAdminAction(admin, `enrollment.update`, `#${id} → ${String(body.status)}`, request);
return NextResponse.json({ message: `Enrollment marked as ${body.status}.` });
}

/** Permanently remove a course access record. */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Missing enrollment id." }, { status: 400 });
  }

  const success = await deleteEnrollment(id);
  if (!success) {
    return NextResponse.json(
      { error: "Failed to remove the enrollment." },
      { status: 500 },
    );
  }
    await logAdminAction(admin, "enrollment.delete", `#${id}`, request);
return NextResponse.json({ message: "Course access removed." });
}
