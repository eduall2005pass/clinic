import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/mysql";
import { logAdminAction, AVAILABLE_ROLES } from "@/lib/administration";
import type { AdminAccountRow } from "@/lib/administration";

export const dynamic = "force-dynamic";

const SAFE_COLUMNS =
  "uid, email, display_name AS displayName, role, is_active AS isActive, created_at AS createdAt";

export async function GET() {
  try {
    const admins = await query<Record<string, unknown>[]>(
      `SELECT uid, email, display_name AS displayName, photo_url AS photoUrl, role, is_active AS isActive, created_at AS createdAt FROM admins ORDER BY created_at ASC`,
    );
    return NextResponse.json(
      { admins },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Migration (src/sql/admins-management-migration.sql) not applied yet.
    try {
      const admins = await query<Record<string, unknown>[]>(
        `SELECT uid, email, display_name AS displayName, photo_url AS photoUrl,
                'admin' AS role, 1 AS isActive, created_at AS createdAt
         FROM admins ORDER BY created_at ASC`,
      );
      return NextResponse.json(
        { admins },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return NextResponse.json({ admins: [] });
    }
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
    | { uid?: unknown; email?: unknown; displayName?: unknown; role?: unknown }
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
  const role = normalizeRole(body.role);
  try {
    await query(
      `INSERT INTO admins (uid, email, display_name, role, is_active) VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE email = VALUES(email), display_name = VALUES(display_name)`,
      [body.uid, body.email.trim().toLowerCase(), body.displayName?.toString().trim() || null, role],
    );
    await logAdminAction(admin, "admin.add", `${body.email} role=${role}`, request);
    const admins = await query(`SELECT ${SAFE_COLUMNS} FROM admins ORDER BY created_at ASC`);
    return NextResponse.json({ admins });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add the admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Edit an admin's profile and/or role: { uid, displayName?, email?, role? }. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { uid?: unknown; email?: unknown; displayName?: unknown; role?: unknown }
    | null;
  if (typeof body?.uid !== "string") {
    return NextResponse.json({ error: "Missing admin uid." }, { status: 400 });
  }
  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    updates.push("email = ?");
    values.push(body.email.trim().toLowerCase());
  }
  if (body.displayName !== undefined) {
    const name = body.displayName?.toString().trim() ?? "";
    if (name === "") {
      updates.push("display_name = NULL");
    } else {
      updates.push("display_name = ?");
      values.push(name);
    }
  }
  let role: string | null = null;
  if (body.role !== undefined) {
    role = normalizeRole(body.role);
    updates.push("role = ?");
    values.push(role);
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  try {
    await query(`UPDATE admins SET ${updates.join(", ")} WHERE uid = ?`, [
      ...values,
      body.uid,
    ]);
    await logAdminAction(
      admin,
      role ? "admin.role" : "admin.edit",
      `uid=${body.uid}${role ? ` role=${role}` : ""}`,
      request,
    );
    const admins = await query(`SELECT ${SAFE_COLUMNS} FROM admins ORDER BY created_at ASC`);
    return NextResponse.json({ admins });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Activate/deactivate an admin: { uid, isActive: boolean }. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { uid?: unknown; isActive?: unknown }
    | null;
  if (typeof body?.uid !== "string" || typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "uid and isActive (boolean) are required." },
      { status: 400 },
    );
  }
  if (!body.isActive) {
    const active = await countActiveAdmins();
    const target = await query<{ isActive: number }[]>(
      `SELECT is_active AS isActive FROM admins WHERE uid = ? LIMIT 1`,
      [body.uid],
    );
    if (target[0]?.isActive && active <= 1) {
      return NextResponse.json(
        { error: "Cannot deactivate the last authorized administrator." },
        { status: 400 },
      );
    }
  }
  try {
    await query(`UPDATE admins SET is_active = ? WHERE uid = ?`, [
      body.isActive ? 1 : 0,
      body.uid,
    ]);
    await logAdminAction(
      admin,
      body.isActive ? "admin.activate" : "admin.deactivate",
      `uid=${body.uid}`,
      request,
    );
    const admins = await query(`SELECT ${SAFE_COLUMNS} FROM admins ORDER BY created_at ASC`);
    return NextResponse.json({ admins });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the admin status.";
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
  const remaining = await query<{ total: number; active: number }[]>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active
     FROM admins WHERE uid != ?`,
    [body.uid],
  );
  const after = remaining[0];
  if ((after?.total ?? 0) < 1 || (after?.active ?? 0) < 1) {
    return NextResponse.json(
      { error: "At least one authorized administrator must remain." },
      { status: 400 },
    );
  }
  await query(`DELETE FROM admins WHERE uid = ?`, [body.uid]);
  await logAdminAction(admin, "admin.remove", `uid=${body.uid}`, request);
  const admins = await query(`SELECT ${SAFE_COLUMNS} FROM admins ORDER BY created_at ASC`);
  return NextResponse.json({ admins });
}

function normalizeRole(value: unknown): string {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (AVAILABLE_ROLES as readonly string[]).includes(role) ? role : "admin";
}

async function countActiveAdmins(): Promise<number> {
  const rows = await query<{ active: number }[]>(
    `SELECT COALESCE(SUM(is_active), 0) AS active FROM admins`,
  );
  return rows[0]?.active ?? 0;
}
