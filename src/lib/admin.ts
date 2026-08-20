import { NextRequest } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query, isMysqlConfigured } from "@/lib/mysql";
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
 */
export async function isAdminUid(uid: string): Promise<boolean> {
  if (!isMysqlConfigured) return false;
  try {
    const rows = await query<{ uid: string }[]>(
      "SELECT uid FROM admins WHERE uid = ? LIMIT 1",
      [uid],
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
  return (await isAdminUid(user.uid)) ? user : null;
}