import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import { fetchQaAskOptions } from "@/lib/qa-store";

export const dynamic = "force-dynamic";

/**
 * Dropdown data for the student Ask form:
 *   categories → Course Control categories
 *   courses    → ONLY the student's ACTIVE enrollments
 *   subjects   → subjects assigned to those enrolled courses
 * No arbitrary course can appear here — enrollment is the source of truth.
 */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const options = await fetchQaAskOptions(user.uid);
  return NextResponse.json(options, {
    headers: { "Cache-Control": "no-store" },
  });
}
