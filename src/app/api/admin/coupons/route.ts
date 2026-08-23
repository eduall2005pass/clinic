import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { fetchCoupons, saveCoupon, deleteCoupon, validateCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get("validate")) {
    const code = request.nextUrl.searchParams.get("validate") ?? "";
    const result = await validateCoupon(code);
    return NextResponse.json(result);
  }
  const coupons = await fetchCoupons();
  return NextResponse.json(
    { coupons },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    await saveCoupon(body);
    await logAdminAction(admin, "coupon.save", String(body.code ?? ""), request);
    const coupons = await fetchCoupons();
    return NextResponse.json({ coupons });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the coupon.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (typeof body?.code !== "string" || !body.code) {
    return NextResponse.json({ error: "Missing coupon code." }, { status: 400 });
  }
  await deleteCoupon(body.code);
  await logAdminAction(admin, "coupon.delete", body.code, request);
  const coupons = await fetchCoupons();
  return NextResponse.json({ coupons });
}
