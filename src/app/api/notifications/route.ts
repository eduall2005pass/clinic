import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { fetchStudentNotifications } from "@/lib/content-admin";

export const dynamic = "force-dynamic";

/**
 * Notifications for the logged-in student — active broadcasts ("all"),
 * enrolled-only notifications and ones targeted at this student.
 */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const notifications = await fetchStudentNotifications(user.uid);
  return NextResponse.json(
    { notifications },
    { headers: { "Cache-Control": "no-store" } },
  );
}
