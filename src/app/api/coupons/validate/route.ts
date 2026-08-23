import { NextRequest, NextResponse } from "next/server";
import { validateCoupon, computeDiscountedFee } from "@/lib/coupons";

export const dynamic = "force-dynamic";

/**
 * Public coupon validation for checkout: ?code=HSC28&fee=4500
 * Returns the validated discount and the final fee without exposing
 * any admin-only coupon details.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const fee = Number(request.nextUrl.searchParams.get("fee")) || 0;
  if (!code) {
    return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
  }
  if (fee <= 0) {
    return NextResponse.json({ error: "This course has no fee to discount." }, { status: 400 });
  }
  const result = await validateCoupon(code);
  if (result.error || !result.coupon) {
    return NextResponse.json(
      { valid: false, error: result.error ?? "Invalid coupon code." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const finalFee = computeDiscountedFee(result.coupon, fee);
  return NextResponse.json(
    {
      valid: true,
      code: result.coupon.code,
      finalFee,
      originalFee: Math.max(0, Math.round(fee)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
