import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  getEnrollmentSettings,
  setFreeAutoEnroll,
} from "@/lib/enrollments-admin";
import { exec } from "@/lib/mysql";

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
  const body = (await request.json().catch(() => null)) as
    | (Record<string, unknown> & { freeAutoEnroll?: unknown })
    | null;
  if (typeof body?.freeAutoEnroll !== "boolean") {
    return NextResponse.json(
      { error: "freeAutoEnroll must be true or false." },
      { status: 400 },
    );
  }
  await setFreeAutoEnroll(body.freeAutoEnroll, admin.uid);
  // Optional payment-card fields saved in the same request.
  const strField = (key: string, max: number): string | null =>
    typeof body[key] === "string"
      ? ((body[key] as string).trim().slice(0, max) || null)
      : null;
  const bkash = strField("bkashNumber", 40);
  const nagad = strField("nagadNumber", 40);
  const instructions = strField("paymentInstructions", 2000);
  await exec(
    `UPDATE enrollment_settings SET bkash_number = COALESCE(?, bkash_number),
       nagad_number = COALESCE(?, nagad_number),
       payment_instructions = COALESCE(?, payment_instructions)
     WHERE id = 'default'`,
    [bkash, nagad, instructions],
  );
  await logAdminAction(
    admin,
    "enrollment.settings",
    `freeAutoEnroll=${body.freeAutoEnroll}`,
    request,
  );
  return NextResponse.json({ freeAutoEnroll: body.freeAutoEnroll });
}
