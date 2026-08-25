import { NextResponse } from "next/server";
import { fetchActiveDashboardCards } from "@/lib/dashboard-cards";

export const dynamic = "force-dynamic";

/** Live custom cards for the Student Dashboard (active only). */
export async function GET() {
  const cards = await fetchActiveDashboardCards();
  return NextResponse.json(
    { cards },
    { headers: { "Cache-Control": "no-store" } },
  );
}
