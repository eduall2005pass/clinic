import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await query<
      { db: string; host: string; port: number }[]
    >("SELECT DATABASE() AS db, @@hostname AS host, @@port AS port");
    const counts: Record<string, number | string> = {};
    for (const t of ["catalog_courses", "banners", "mentors"]) {
      try {
        const rows = await query<{ c: number }[]>(
          `SELECT COUNT(*) AS c FROM ${t}`,
        );
        counts[t] = rows[0]?.c ?? "err";
      } catch (e) {
        counts[t] = e instanceof Error ? e.message.slice(0, 80) : "err";
      }
    }
    return NextResponse.json({ info: info[0], counts });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
