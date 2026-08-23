import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchStudents,
  fetchStudentDetail,
  setStudentActive,
} from "@/lib/students-admin";

export const dynamic = "force-dynamic";

/** List students (search + status filter) or fetch a single student's details. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageStudents");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");

  if (uid) {
    const detail = await fetchStudentDetail(uid);
    if (!detail) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }
    return NextResponse.json(detail);
  }

  const search = url.searchParams.get("search") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "active" || statusParam === "deactivated"
      ? statusParam
      : "all";

  const students = await fetchStudents({ search, status });
  return NextResponse.json({ students });
}

/** Activate / deactivate a student account. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageStudents");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    uid?: unknown;
    isActive?: unknown;
  } | null;

  if (typeof body?.uid !== "string" || body.uid.length === 0) {
    return NextResponse.json({ error: "Missing student id." }, { status: 400 });
  }
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be true or false." },
      { status: 400 },
    );
  }

  const success = await setStudentActive(body.uid, body.isActive);
  if (!success) {
    return NextResponse.json(
      { error: "Failed to update the account. Has the migration been applied?" },
      { status: 500 },
    );
  }

  await logAdminAction(admin, `student.${body.isActive ? "restore" : "delete"}`, body.uid, request);

  return NextResponse.json({
    message: body.isActive
      ? "Account activated."
      : "Account deactivated.",
  });
}
