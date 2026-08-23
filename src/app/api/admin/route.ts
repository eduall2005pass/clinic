import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, fetchAdminAccount } from "@/lib/admin";
import { recordAdminLogin, resolveAdminPermissions } from "@/lib/administration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (!user) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
  const account = await fetchAdminAccount(user.uid);
  const email = account?.email ?? user.email ?? null;
  await recordAdminLogin({ uid: user.uid, email });
  const { role, permissions } = await resolveAdminPermissions(email);
  return NextResponse.json({
    isAdmin: true,
    admin: {
      uid: user.uid,
      email,
      displayName: account?.displayName ?? user.displayName ?? null,
    },
    role,
    permissions,
  });
}