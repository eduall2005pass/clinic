import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import {
  getRecentlyViewed,
  recordRecentView,
  type RecentItemType,
} from "@/lib/my-learning";

export const dynamic = "force-dynamic";

const VALID_TYPES: RecentItemType[] = ["course", "class", "exam", "material"];

/** GET — the logged-in student's recently viewed items, newest first. */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const items = await getRecentlyViewed(user.uid);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST — record one view. Only content inside an actively enrolled course
 * is accepted; everything else is silently dropped.
 */
export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    itemType?: unknown;
    itemId?: unknown;
  } | null;
  const itemType =
    typeof body?.itemType === "string" &&
    (VALID_TYPES as string[]).includes(body.itemType)
      ? (body.itemType as RecentItemType)
      : null;
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  if (!itemType || !itemId || itemId.length > 191) {
    return NextResponse.json({ error: "Invalid item." }, { status: 400 });
  }
  await recordRecentView(user.uid, itemType, itemId);
  return NextResponse.json({ ok: true });
}
