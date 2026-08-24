import { query, parseDate } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";
import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";
import { fetchAdminAccount } from "@/lib/admin";

// Centralized website logo configuration. The `logos` table holds up to
// THREE rows, one per slot:
//   id = "active"       → shared/fallback logo (legacy single-logo slot)
//   id = "active-light" → LIGHT MODE logo
//   id = "active-dark"  → DARK MODE logo
// The main website picks light/dark by the VISITOR'S CURRENT THEME and falls
// back to the shared "active" row, then to DEFAULT_LOGO. Nothing is hard-coded.
export const LOGO_COLLECTION = "logos";
export const LOGO_DOCUMENT_ID = "active";
export const LOGO_STORAGE_DIR = "website/logo";

export type LogoMode = "light" | "dark";

export const LOGO_VARIANT_IDS: Record<LogoMode, string> = {
  light: "active-light",
  dark: "active-dark",
};

type LogoRow = {
  url: string;
  file_name: string;
  width: number;
  height: number;
  storage_path: string;
  updated_at: Date | string;
  updated_by: string | null;
};

export const getActiveLogo = fetchActiveLogo;

async function ensureLogosTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS logos (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        url VARCHAR(1024) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        width INT NOT NULL,
        height INT NOT NULL,
        storage_path VARCHAR(1024) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(191) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

function withCacheBust(url: string, updatedAt: number): string {
  if (!url || updatedAt <= 0) return url;
  // Append cache-bust query param so browsers/CDN fetch fresh image after upload.
  // If URL already has query (e.g. legacy Firebase ?alt=media), append with &.
  const sep = url.includes("?") ? "&" : "?";
  // Avoid double-appending if already has v=
  if (url.includes("v=")) return url;
  return `${url}${sep}v=${updatedAt}`;
}

function rowToLogo(data: LogoRow): LogoInfo {
  const updatedAt = Date.parse(parseDate(data.updated_at)) || 0;
  return {
    fileName: data.file_name,
    url: withCacheBust(data.url, updatedAt),
    width:
      typeof data.width === "number" && data.width > 0
        ? data.width
        : DEFAULT_LOGO.width,
    height:
      typeof data.height === "number" && data.height > 0
        ? data.height
        : DEFAULT_LOGO.height,
    updatedAt,
    updatedBy: data.updated_by ?? null,
  };
}

async function fetchLogoById(id: string): Promise<LogoInfo | null> {
  const rows = await query<LogoRow[]>(
    "SELECT url, file_name, width, height, storage_path, updated_at, updated_by FROM logos WHERE id = ? LIMIT 1",
    [id],
  );
  const data = rows[0];
  return data ? rowToLogo(data) : null;
}

/** Shared/fallback logo — used when no theme-specific variant is set. */
export async function fetchActiveLogo(): Promise<LogoInfo | null> {
  try {
    const logo = await fetchLogoById(LOGO_DOCUMENT_ID);
    if (!logo || !logo.updatedBy) return logo;
    const account = await fetchAdminAccount(logo.updatedBy);
    return account
      ? { ...logo, updatedBy: account.displayName ?? account.email ?? logo.updatedBy }
      : logo;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // If table missing, try to create it and retry once (self-heal on Interserver)
    if (
      msg.includes("doesn't exist") ||
      msg.includes("Unknown table") ||
      msg.includes("no such table")
    ) {
      await ensureLogosTable();
      try {
        return await fetchLogoById(LOGO_DOCUMENT_ID);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Both theme-specific logos at once. Each is null when the admin has not
 * uploaded that variant yet — the caller then falls back to the shared logo.
 */
export async function fetchThemeLogos(): Promise<{
  light: LogoInfo | null;
  dark: LogoInfo | null;
}> {
  try {
    const rows = await query<(LogoRow & { id: string })[]>(
      `SELECT id, url, file_name, width, height, storage_path, updated_at, updated_by
       FROM logos WHERE id IN (?, ?)`,
      [LOGO_VARIANT_IDS.light, LOGO_VARIANT_IDS.dark],
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    const lightRow = byId.get(LOGO_VARIANT_IDS.light);
    const darkRow = byId.get(LOGO_VARIANT_IDS.dark);
    return {
      light: lightRow ? rowToLogo(lightRow) : null,
      dark: darkRow ? rowToLogo(darkRow) : null,
    };
  } catch {
    return { light: null, dark: null };
  }
}

function targetIdFor(mode?: LogoMode): string {
  return mode ? LOGO_VARIANT_IDS[mode] : LOGO_DOCUMENT_ID;
}

export async function saveActiveLogo(
  file: File,
  width: number,
  height: number,
  adminUid: string,
  /** When set, uploads into the theme-specific slot instead of the shared one. */
  mode?: LogoMode,
): Promise<LogoInfo> {
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const suffix = mode ? `${mode}-logo` : "active-logo";
  const storagePath = `${LOGO_STORAGE_DIR}/${suffix}-${Date.now()}${extension}`;
  // Read file buffer once — callers may have already consumed the original File
  // stream, so we tolerate both File and already-buffered data.
  const buffer = await file.arrayBuffer();
  const cleanUrl = await saveFile(
    LOGO_STORAGE_DIR,
    storagePath.split("/").pop() ?? "",
    buffer,
  );

  // Ensure table exists before read/write (first upload on fresh DB)
  await ensureLogosTable();

  const targetId = targetIdFor(mode);

  let previousStoragePath: string | null = null;
  try {
    const rows = await query<{ storage_path: string }[]>(
      "SELECT storage_path FROM logos WHERE id = ? LIMIT 1",
      [targetId],
    );
    const previousPath: unknown = rows[0]?.storage_path;
    if (typeof previousPath === "string" && isLocalUpload(previousPath)) {
      previousStoragePath = previousPath;
    }
  } catch {
    // Keep going — cleaning up the old file is best-effort only.
  }

  // Store clean URL in DB; cache-bust is added at read time.
  await query(
    `INSERT INTO logos
      (id, url, file_name, width, height, storage_path, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE
      url = VALUES(url),
      file_name = VALUES(file_name),
      width = VALUES(width),
      height = VALUES(height),
      storage_path = VALUES(storage_path),
      updated_at = NOW(),
      updated_by = VALUES(updated_by)`,
    [targetId, cleanUrl, file.name, width, height, storagePath, adminUid],
  );

  // Only clean up this slot's previous file — other slots stay untouched so
  // both theme logos always remain available simultaneously.
  if (previousStoragePath) {
    await removeFile(previousStoragePath);
  }

  const account = await fetchAdminAccount(adminUid);
  const now = Date.now();
  return {
    fileName: file.name,
    url: withCacheBust(cleanUrl, now),
    width,
    height,
    updatedAt: now,
    updatedBy: account?.displayName ?? account?.email ?? adminUid,
  };
}

export async function removeActiveLogo(mode?: LogoMode): Promise<void> {
  try {
    const targetId = targetIdFor(mode);
    const rows = await query<{ storage_path: string }[]>(
      "SELECT storage_path FROM logos WHERE id = ? LIMIT 1",
      [targetId],
    );
    const storagePath: unknown = rows[0]?.storage_path;
    await query("DELETE FROM logos WHERE id = ?", [targetId]);
    if (typeof storagePath === "string" && isLocalUpload(storagePath)) {
      await removeFile(storagePath);
    }
  } catch {
    // The logo is either already gone or could not be removed.
  }
}
