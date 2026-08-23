import { exec, query } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";

// Admin Panel → Profile. Display profile lives in the `admins` table;
// photos are uploaded into `uploads` (LONGBLOB) and served via /api/files.
// Login history is derived from admin_activity_logs (action = 'login').

export type AdminProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  phoneNumber: string | null;
};

export type LoginActivityEntry = {
  id: number;
  action: string;
  ipAddress: string | null;
  createdAt: string;
};

export async function fetchAdminProfile(uid: string): Promise<AdminProfile | null> {
  try {
    const rows = await query<
      {
        uid: string;
        email: string | null;
        display_name: string | null;
        photo_url: string | null;
        phone_number: string | null;
      }[]
    >(
      `SELECT uid, email, display_name, photo_url, phone_number FROM admins WHERE uid = ? LIMIT 1`,
      [uid],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      uid: row.uid,
      email: row.email,
      displayName: row.display_name,
      photoUrl: row.photo_url,
      phoneNumber: row.phone_number,
    };
  } catch {
    return null;
  }
}

async function ensureProfileColumns(): Promise<void> {
  await exec(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1024) NULL`);
  await exec(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32) NULL`);
}

export async function updateAdminProfile(
  uid: string,
  input: { displayName?: unknown; phoneNumber?: unknown },
): Promise<AdminProfile> {
  await ensureProfileColumns();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (typeof input.displayName === "string") {
    const value = input.displayName.trim();
    if (value.length > 0) {
      updates.push("display_name = ?");
      params.push(value);
    }
  }
  if (typeof input.phoneNumber === "string") {
    updates.push("phone_number = ?");
    params.push(input.phoneNumber.trim().slice(0, 32));
  }
  if (updates.length > 0) {
    await exec(`UPDATE admins SET ${updates.join(", ")} WHERE uid = ?`, [
      ...params,
      uid,
    ]);
  }
  const profile = await fetchAdminProfile(uid);
  if (!profile) throw new Error("Admin account not found.");
  return profile;
}

export async function saveAdminPhoto(
  uid: string,
  file: File,
): Promise<AdminProfile> {
  await ensureProfileColumns();
  const previous = await fetchAdminProfile(uid);
  const url = await saveFile("admin/profile", file.name || "photo", await file.arrayBuffer());
  await exec(`UPDATE admins SET photo_url = ? WHERE uid = ?`, [url, uid]);
  // Best-effort cleanup of the replaced upload.
  if (previous?.photoUrl && isLocalUpload(previous.photoUrl)) {
    await removeFile(previous.photoUrl);
  }
  const profile = await fetchAdminProfile(uid);
  if (!profile) throw new Error("Admin account not found.");
  return profile;
}

/** Login/activity history for the current admin. */
export async function fetchLoginActivity(
  uid: string,
  limit = 50,
): Promise<LoginActivityEntry[]> {
  try {
    const rows = await query<{
      id: number;
      action: string;
      ip_address: string | null;
      created_at: Date | string;
    }[]>(
      `SELECT id, action, ip_address, created_at
       FROM admin_activity_logs
       WHERE admin_uid = ? AND action IN ('login', 'logout')
       ORDER BY created_at DESC LIMIT ${Math.min(200, Math.max(1, limit))}`,
      [uid],
    );
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      ipAddress: row.ip_address,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Role for this admin from the admin_roles table — null when none set. */
export async function fetchAdminRole(email: string | null): Promise<string | null> {
  if (!email) return null;
  try {
    const rows = await query<{ role: string }[]>(
      "SELECT role FROM admin_roles WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0]?.role ?? null;
  } catch {
    // Table may not exist yet on older databases.
    return null;
  }
}

/** Most recent successful login timestamp for this admin. */
export async function fetchLastLogin(uid: string): Promise<string | null> {
  try {
    const rows = await query<{ created_at: Date | string }[]>(
      `SELECT created_at FROM admin_activity_logs
       WHERE admin_uid = ? AND action = 'login'
       ORDER BY created_at DESC LIMIT 1`,
      [uid],
    );
    const value = rows[0]?.created_at;
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  } catch {
    return null;
  }
}

// ── System module ────────────────────────────────────────────────────────

export type SystemStatus = {
  databaseOnline: boolean;
  databaseLatencyMs: number | null;
  counts: Record<string, number>;
};

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const status: SystemStatus = { databaseOnline: false, databaseLatencyMs: null, counts: {} };
  const started = Date.now();
  try {
    await query("SELECT 1");
    status.databaseOnline = true;
    status.databaseLatencyMs = Date.now() - started;

    const tables = [
      ["students", "students"],
      ["enrollments", "enrollments"],
      ["courses", "catalog_courses"],
      ["exams", "exams"],
      ["examQuestions", "exam_questions"],
      ["admins", "admins"],
      ["uploads", "uploads"],
    ] as const;
    for (const [key, table] of tables) {
      try {
        const rows = await query<{ total: number }[]>(
          `SELECT COUNT(*) AS total FROM ${table}`,
        );
        status.counts[key] = rows[0]?.total ?? 0;
      } catch {
        status.counts[key] = 0;
      }
    }
  } catch {
    status.databaseOnline = false;
  }
  return status;
}
