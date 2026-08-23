import { exec, query } from "@/lib/mysql";
import { saveFile } from "@/lib/storage";

// Admin Panel → System → Backup. Backups are JSON dumps of the important
// MySQL tables stored inside the `uploads` table (LONGBLOB) — the serverless
// filesystem is ephemeral and no database credentials are ever exposed.
// Downloads/restores go through admin-only API routes; backup files are never
// served through the public /api/files endpoint.

const BACKUP_DIR = "backups";
const BACKUP_VERSION = 1;

/** Tables included in backups (uploads blobs are excluded — images only). */
const BACKUP_TABLES = [
  "students",
  "student_ids",
  "student_category_stats",
  "admins",
  "admin_roles",
  "role_permissions",
  "admin_activity_logs",
  "courses",
  "catalog_courses",
  "enrollments",
  "exams",
  "exam_questions",
  "exam_results",
  "exam_enrollments",
  "exam_courses",
  "exam_settings",
  "website_settings",
  "theme_settings",
  "seo_settings",
  "homepage_sections",
  "homepage_courses",
  "banners",
  "jerseys",
  "notifications",
  "coupons",
  "featured_courses",
  "mentors",
  "faqs",
  "reviews",
] as const;

export type BackupEntry = {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
};

type UploadRow = {
  id: string;
  file_name: string;
  size: number;
  created_at: Date | string;
};

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await query<{ name: string }[]>(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

async function tableColumns(name: string): Promise<string[]> {
  const rows = await query<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?
     ORDER BY ordinal_position ASC`,
    [name],
  );
  return rows.map((row) => row.column_name);
}

export async function listBackups(): Promise<BackupEntry[]> {
  try {
    const rows = await query<UploadRow[]>(
      `SELECT id, file_name, size, created_at FROM uploads
       WHERE directory = ? ORDER BY created_at DESC LIMIT 100`,
      [BACKUP_DIR],
    );
    return rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      size: row.size ?? 0,
      createdAt: toIso(row.created_at),
    }));
  } catch {
    return [];
  }
}

export async function createBackup(
  createdBy: string,
): Promise<BackupEntry> {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    try {
      if (!(await tableExists(table))) continue;
      if (table === "students") {
        // Dump students without auth-irrelevant noise but keep every column —
        // restoring must reproduce the exact state.
        const rows = await query<Record<string, unknown>[]>(
          `SELECT * FROM ${table}`,
        );
        tables[table] = rows;
        counts[table] = rows.length;
        continue;
      }
      const rows = await query<Record<string, unknown>[]>(`SELECT * FROM ${table}`);
      tables[table] = rows;
      counts[table] = rows.length;
    } catch {
      // Skip tables that cannot be read (schema drift) instead of failing.
    }
  }

  const payload = {
    meta: {
      app: "medispark",
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      createdBy,
      counts,
    },
    tables,
  };

  const json = JSON.stringify(payload);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 15);
  await saveFile(BACKUP_DIR, `medispark-backup-${stamp}.json`, Buffer.from(json, "utf8"));

  const backups = await listBackups();
  if (!backups[0]) throw new Error("Failed to store the backup.");
  return backups[0];
}

async function readBackupFile(id: string): Promise<{
  fileName: string;
  data: Buffer;
} | null> {
  const rows = await query<
    { file_name: string; data: Buffer | Uint8Array }[]
  >(
    `SELECT file_name, data FROM uploads
     WHERE id = ? AND directory = ? LIMIT 1`,
    [id, BACKUP_DIR],
  );
  const row = rows[0];
  if (!row) return null;
  const raw = row.data;
  return {
    fileName: row.file_name,
    data: Buffer.isBuffer(raw) ? raw : Buffer.from(raw),
  };
}

export async function getBackupJson(
  id: string,
): Promise<{ fileName: string; payload: unknown } | null> {
  const file = await readBackupFile(id);
  if (!file) return null;
  try {
    return { fileName: file.fileName, payload: JSON.parse(file.data.toString("utf8")) };
  } catch {
    return null;
  }
}

export async function deleteBackup(id: string): Promise<boolean> {
  const result = await exec(
    `DELETE FROM uploads WHERE id = ? AND directory = ?`,
    [id, BACKUP_DIR],
  );
  return (result.affectedRows ?? 0) > 0;
}

export type RestoreSummary = {
  tables: Record<string, number>;
  skipped: string[];
};

/**
 * Restore rows from a Medispark backup JSON. Only tables that currently exist
 * are touched; columns missing from the live schema are dropped per-row.
 * Existing rows with the same primary key are overwritten.
 */
export async function restoreBackup(
  id: string,
): Promise<RestoreSummary> {
  const backup = await getBackupJson(id);
  if (!backup) throw new Error("Backup not found.");
  const payload = backup.payload as {
    meta?: { app?: unknown };
    tables?: Record<string, unknown[]>;
  };
  if (payload.meta?.app !== "medispark" || typeof payload.tables !== "object" || payload.tables === null) {
    throw new Error("This file is not a valid MediSpark backup.");
  }

  const summary: RestoreSummary = { tables: {}, skipped: [] };

  for (const [table, rawRows] of Object.entries(payload.tables)) {
    if (!Array.isArray(rawRows)) continue;
    // Never touch uploads metadata on restore — blobs are not in the backup.
    if (table === "uploads") {
      summary.skipped.push(table);
      continue;
    }
    try {
      if (!(await tableExists(table))) {
        summary.skipped.push(table);
        continue;
      }
      const liveColumns = new Set(await tableColumns(table));
      let restored = 0;
      for (const rawRow of rawRows) {
        if (typeof rawRow !== "object" || rawRow === null) continue;
        const row = rawRow as Record<string, unknown>;
        const cols = Object.keys(row).filter((key) => liveColumns.has(key));
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => "?").join(", ");
        const updates = cols.map((col) => `\`${col}\` = VALUES(\`${col}\`)`).join(", ");
        await exec(
          `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")})
           VALUES (${placeholders})
           ON DUPLICATE KEY UPDATE ${updates}`,
          cols.map((col) => {
            const value = row[col];
            return value !== null && typeof value === "object"
              ? JSON.stringify(value)
              : value;
          }),
        );
        restored += 1;
      }
      summary.tables[table] = restored;
    } catch {
      summary.skipped.push(table);
    }
  }

  return summary;
}
