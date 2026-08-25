import { NextRequest } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query, isMysqlConfigured } from "@/lib/mysql";
import { resolveAdminPermissions, type AdminPermission } from "@/lib/administration";
import type { DecodedIdToken } from "firebase-admin/auth";

export type AdminAccount = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

/**
 * Checks whether the given Firebase UID is an authorized admin.
 * Admin accounts are stored in the `admins` table — see
 * src/sql/logo-admin-migration.sql. Writes to website settings are
 * rejected unless the caller resolves to an admin here.
 *
 * Falls back to matching by verified email so accounts keep their access
 * even when the underlying Firebase project (and therefore UID) changes.
 */
export async function isAdminUid(
  uid: string | null,
  email?: string | null,
): Promise<boolean> {
  if (!isMysqlConfigured) return false;

  if (uid) {
    try {
      // Inactive admins are no longer authorized — see Admin Management.
      const rows = await query<{ uid: string }[]>(
        "SELECT uid FROM admins WHERE uid = ? AND is_active = 1 LIMIT 1",
        [uid],
      );
      if (rows.length > 0) return true;
    } catch {
      // Migration (src/sql/admins-management-migration.sql) may not be
      // applied yet — fall back to plain lookup so nobody gets locked out.
      try {
        const rows = await query<{ uid: string }[]>(
          "SELECT uid FROM admins WHERE uid = ? LIMIT 1",
          [uid],
        );
        if (rows.length > 0) return true;
      } catch {
        return false;
      }
    }
  }

  // Email fallback keeps access working even when the underlying Firebase
  // project (and therefore UID) changes. Only verified emails are trusted.
  if (!email) return false;
  try {
    const rows = await query<{ uid: string }[]>(
      "SELECT uid FROM admins WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 1",
      [email],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function fetchAdminAccount(
  uid: string,
): Promise<AdminAccount | null> {
  if (!isMysqlConfigured) return null;
  try {
    const rows = await query<
      { uid: string; email: string | null; display_name: string | null }[]
    >("SELECT uid, email, display_name FROM admins WHERE uid = ? LIMIT 1", [
      uid,
    ]);
    const row = rows[0];
    if (!row) return null;
    return {
      uid: row.uid,
      email: row.email,
      displayName: row.display_name,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies the caller is an authenticated, authorized admin.
 * Returns the decoded token on success, null otherwise.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<DecodedIdToken | null> {
  const user = await getFirebaseUser(request);
  if (!user) return null;
  const emailOk = user.email_verified === true;
  const authorized =
    (await isAdminUid(user.uid)) ||
    (emailOk ? await isAdminUid(null, user.email) : false);
  return authorized ? user : null;
}

/**
 * Role-based gate: like requireAdmin, but additionally enforces that the
 * admin's role grants the requested permission. Returns null when the
 * caller is not an admin or lacks the permission.
 */
export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
): Promise<DecodedIdToken | null> {
  const user = await requireAdmin(request);
  if (!user) return null;
  const { permissions } = await resolveAdminPermissions(user.email);
  return permissions.includes(permission) ? user : null;
}