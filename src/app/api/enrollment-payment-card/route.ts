import { NextResponse } from "next/server";
import { getPaymentCard } from "@/lib/enrollments-admin";

export const dynamic = "force-dynamic";

/** Public — the payment card students see during paid enrollment (live from MySQL). */
export async function GET() {
  const card = await getPaymentCard();
  return NextResponse.json(card, { headers: { "Cache-Control": "no-store" } });
}
