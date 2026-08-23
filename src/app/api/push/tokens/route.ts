import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { deletePushToken, savePushToken } from "@/lib/push-admin";

export const dynamic = "force-dynamic";

/** Register a browser push token for the signed-in user. */
export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    userAgent?: unknown;
  } | null;
  if (typeof body?.token !== "string" || body.token.length < 16) {
    return NextResponse.json({ error: "Missing push token." }, { status: 400 });
  }
  try {
    await savePushToken(
      body.token,
      user.uid,
      user.email ?? null,
      typeof body.userAgent === "string" ? body.userAgent : null,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save the subscription." },
      { status: 500 },
    );
  }
}

/** Unsubscribe a browser push token. */
export async function DELETE(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  if (typeof body?.token === "string") {
    await deletePushToken(body.token).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
