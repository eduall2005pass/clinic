import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { getPaymentCard, savePaymentCard } from "@/lib/payment-card";
import { PAYMENT_CARD_MAX } from "@/lib/payment-card-config";

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
 * Accepts the full PaymentCardConfig with per-element enable/disable and labels.
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
  const bool = (value: unknown, def = false) =>
    typeof value === "boolean" ? value : def;

  const M = PAYMENT_CARD_MAX;
  const config = {
    bkashNumber: str(body.bkashNumber, M.bkashNumber),
    nagadNumber: str(body.nagadNumber, M.nagadNumber),
    bkashEnabled: bool(body.bkashEnabled, true),
    nagadEnabled: bool(body.nagadEnabled, false),
    couponEnabled: bool(body.couponEnabled, true),
    instructions: str(body.instructions, M.instructions),
    note: str(body.note, M.note),
    feeEnabled: bool(body.feeEnabled, true),
    feeLabel: str(body.feeLabel, M.feeLabel),
    discountLabel: str(body.discountLabel, M.discountLabel),
    couponPlaceholder: str(body.couponPlaceholder, M.couponPlaceholder),
    applyLabel: str(body.applyLabel, M.applyLabel),
    payableEnabled: bool(body.payableEnabled, true),
    payableLabel: str(body.payableLabel, M.payableLabel),
    methodsLabel: str(body.methodsLabel, M.methodsLabel),
    bkashLabel: str(body.bkashLabel, M.bkashLabel),
    nagadLabel: str(body.nagadLabel, M.nagadLabel),
    instructionsEnabled: bool(body.instructionsEnabled, true),
    txEnabled: bool(body.txEnabled, true),
    txLabel: str(body.txLabel, M.txLabel),
    txPlaceholder: str(body.txPlaceholder, M.txPlaceholder),
    senderEnabled: bool(body.senderEnabled, true),
    senderLabel: str(body.senderLabel, M.senderLabel),
    senderPlaceholder: str(body.senderPlaceholder, M.senderPlaceholder),
    pendingNoteEnabled: bool(body.pendingNoteEnabled, true),
    pendingNote: str(body.pendingNote, M.pendingNote),
    cancelEnabled: bool(body.cancelEnabled, true),
    cancelLabel: str(body.cancelLabel, M.cancelLabel),
    submitEnabled: bool(body.submitEnabled, true),
    submitLabel: str(body.submitLabel, M.submitLabel),
    submittingLabel: str(body.submittingLabel, M.submittingLabel),
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
