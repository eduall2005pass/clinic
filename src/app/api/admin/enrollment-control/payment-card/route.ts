import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { getPaymentCard, savePaymentCard } from "@/lib/payment-card";

export const dynamic = "force-dynamic";

/** GET — current payment card configuration. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const config = await getPaymentCard();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * PUT — save payment card configuration.
 * { bkashNumber, bkashEnabled, nagadNumber, nagadEnabled, couponEnabled, instructions, note }
 * At least one payment method must remain enabled with a number.
 */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const config = {
    bkashNumber: str(body.bkashNumber, 40),
    nagadNumber: str(body.nagadNumber, 40),
    bkashEnabled: body.bkashEnabled === true,
    nagadEnabled: body.nagadEnabled === true,
    // Coupon availability defaults ON; OFF only hides it from students —
    // existing coupon data/configuration is never deleted.
    couponEnabled: body.couponEnabled !== false,
    instructions: str(body.instructions, 2000),
    note: str(body.note, 1000),
  };

  if (!config.bkashEnabled && !config.nagadEnabled) {
    return NextResponse.json(
      { error: "At least one payment method must be enabled." },
      { status: 400 },
    );
  }
  if (config.bkashEnabled && !/^[0-9+\- ]{6,40}$/.test(config.bkashNumber)) {
    return NextResponse.json(
      { error: "Enter a valid bKash number." },
      { status: 400 },
    );
  }
  if (config.nagadEnabled && !/^[0-9+\- ]{6,40}$/.test(config.nagadNumber)) {
    return NextResponse.json(
      { error: "Enter a valid Nagad number." },
      { status: 400 },
    );
  }

  try {
    await savePaymentCard(config, admin.uid);
    await logAdminAction(
      admin,
      "payment-card.save",
      `bkash=${config.bkashEnabled ? "on" : "off"} nagad=${config.nagadEnabled ? "on" : "off"} coupon=${config.couponEnabled ? "on" : "off"}`,
      request,
    );
    return NextResponse.json({ message: "Payment card saved." });
  } catch (error) {
    console.error("payment-card PUT failed:", error);
    return NextResponse.json(
      { error: "Failed to save payment card." },
      { status: 500 },
    );
  }
}
