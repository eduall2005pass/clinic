import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, fetchAdminAccount } from "@/lib/admin";
import { recordAdminLogin } from "@/lib/administration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
  const account = await fetchAdminAccount(user.uid);
  await recordAdminLogin({
    uid: user.uid,
    email: account?.email ?? user.email ?? null,
  });
  return NextResponse.json({
    isAdmin: true,
    admin: {
      uid: user.uid,
      email: account?.email ?? user.email ?? null,
      displayName: account?.displayName ?? user.displayName ?? null,
    },
  });
}