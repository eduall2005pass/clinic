import { NextResponse } from "next/server";
import { fetchLiveExamCounts } from "@/lib/public-exams-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await fetchLiveExamCounts();
    return NextResponse.json({ counts }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        counts: {
          "ssc-academic": 0,
          "hsc-academic": 0,
          "medical-admission": 0,
          "varsity-admission": 0,
        },
      },
      { status: 200 },
    );
  }
}
