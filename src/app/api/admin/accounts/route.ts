import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/mysql";
import { logAdminAction } from "@/lib/administration";
import type { AdminAccountRow } from "@/lib/administration";

export const dynamic = "force-dynamic";

const SAFE_COLUMNS = "uid, email, display_name AS displayName, created_at AS createdAt";

export async function GET() {
  try {
    const admins = await query<AdminAccountRow[]>(
      `SELECT uid, email, display_name AS displayName, photo_url AS photoUrl, created_at AS createdAt FROM admins ORDER BY created_at ASC`,
    );
    return NextResponse.json(
      { admins },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ admins: [] });
  }
}

/**
 * Add an admin. The Firebase account must already exist — we only add the
 * authorization row in the `admins` table.
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { uid?: unknown; email?: unknown; displayName?: unknown }
    | null;
  if (typeof body?.uid !== "string" || !/^[A-Za-z0-9_-]{10,191}$/.test(body.uid)) {
    return NextResponse.json(
      { error: "A valid Firebase UID is required." },
      { status: 400 },
    );
  }
  if (
    typeof body.email !== "string" ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)
  ) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  try {
    await query(
      `INSERT INTO admins (uid, email, display_name) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), display_name = VALUES(display_name)`,
      [body.uid, body.email.trim().toLowerCase(), body.displayName?.toString().trim() || null],
    );
    await logAdminAction(admin, "admin.add", body.email as string, request);
    const admins = await query(`SELECT ${SAFE_COLUMNS} FROM admins ORDER BY created_at ASC`);
    return NextResponse.json({ admins });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add the admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { uid?: unknown } | null;
  if (typeof body?.uid !== "string") {
    return NextResponse.json({ error: "Missing admin uid." }, { status: 400 });
  }
  if (body.uid === admin.uid) {
    return NextResponse.json(
      { error: "You cannot remove your own admin account." },
      { status: 400 },
    );
  }
  const remaining = await query<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM admins`,
  );
  if ((remaining[0]?.total ?? 0) <= 1) {
    return NextResponse.json(
      { error: "At least one admin must remain." },
      { status: 400 },
    );
  }
  await query(`DELETE FROM admins WHERE uid = ?`, [body.uid]);
  await logAdminAction(admin, "admin.remove", `uid=${body.uid}`, request);
  const admins = await query(`SELECT ${SAFE_COLUMNS} FROM admins ORDER BY created_at ASC`);
  return NextResponse.json({ admins });
}
