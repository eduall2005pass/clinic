import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchEnrollmentsAdmin,
  setEnrollmentStatus,
  assignCourseToStudent,
  deleteEnrollment,
  acceptEnrollmentApplication,
  rejectEnrollmentApplication,
  getEnrollmentStatusById,
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
  const course = url.searchParams.get("course") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (STATUSES as string[]).includes(statusParam)
      ? (statusParam as EnrollmentStatus)
      : "all";

  const enrollments = await fetchEnrollmentsAdmin({ search, status, courseId: course });
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

/**
 * Update an enrollment.
 *   { id, action: "accept" }  → transactional accept (pending → active,
 *                               access granted, approval audited)
 *   { id, action: "reject" }  → transactional reject (pending → cancelled,
 *                               no access, rejection audited)
 *   { id, status }            → other transitions (revoke/complete/reopen);
 *                               pending rows must go through accept/reject
 */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    status?: unknown;
    action?: unknown;
  } | null;

  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Missing enrollment id." }, { status: 400 });
  }
  const adminUid = admin.uid;

  // ── Accept Enrollment (after manual payment verification) ──
  if (body?.action === "accept") {
    const result = await acceptEnrollmentApplication(id, adminUid);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    await logAdminAction(
      admin,
      "enrollment.accept",
      `#${id} accepted by ${adminUid}`,
      request,
    );
    return NextResponse.json({ message: result.message });
  }

  // ── Reject (confirmation happens in the UI before this call) ──
  if (body?.action === "reject") {
    const result = await rejectEnrollmentApplication(id, adminUid);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    await logAdminAction(
      admin,
      "enrollment.reject",
      `#${id} rejected by ${adminUid}`,
      request,
    );
    return NextResponse.json({ message: result.message });
  }

  // ── Other status transitions (no direct pending → active shortcut) ──
  if (typeof body?.status !== "string" || !(STATUSES as string[]).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (body.status === "active") {
    return NextResponse.json(
      { error: "Use Accept Enrollment to activate a pending application." },
      { status: 400 },
    );
  }
  // Pending rows leaving "pending" as cancelled must be audited rejects.
  if (body.status === "cancelled") {
    const current = await getEnrollmentStatusById(id);
    if (current === "pending") {
      const result = await rejectEnrollmentApplication(id, adminUid);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      await logAdminAction(admin, "enrollment.reject", `#${id} rejected by ${adminUid}`, request);
      return NextResponse.json({ message: result.message });
    }
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
