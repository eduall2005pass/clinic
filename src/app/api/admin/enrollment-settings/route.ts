import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  getEnrollmentSettings,
  setFreeAutoEnroll,
} from "@/lib/enrollments-admin";

export const dynamic = "force-dynamic";

/** GET — current enrollment settings (Free Course auto-enrollment). */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const settings = await getEnrollmentSettings();
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "no-store" },
  });
}

/** PUT — { freeAutoEnroll: boolean }. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    freeAutoEnroll?: unknown;
  } | null;
  if (typeof body?.freeAutoEnroll !== "boolean") {
    return NextResponse.json(
      { error: "freeAutoEnroll must be true or false." },
      { status: 400 },
    );
  }
  await setFreeAutoEnroll(body.freeAutoEnroll, admin.uid);
  await logAdminAction(
    admin,
    "enrollment.settings",
    `freeAutoEnroll=${body.freeAutoEnroll}`,
    request,
  );
  return NextResponse.json({ freeAutoEnroll: body.freeAutoEnroll });
}
