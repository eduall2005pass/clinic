import { NextResponse } from "next/server";
import { getPaymentCard } from "@/lib/payment-card";

export const dynamic = "force-dynamic";

/**
 * Public read — the saved payment card for students. Only enabled methods
 * are returned; disabled numbers never leave the server.
 */
export async function GET() {
  const config = await getPaymentCard();
  return NextResponse.json(
    {
      bkash: config.bkashEnabled && config.bkashNumber
        ? { number: config.bkashNumber }
        : null,
      nagad: config.nagadEnabled && config.nagadNumber
        ? { number: config.nagadNumber }
        : null,
      instructions: config.instructions || null,
      note: config.note || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
