import { query, parseDate } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";
import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";
import { fetchAdminAccount } from "@/lib/admin";

// Centralized website logo configuration. Mirrors the old
// "settings/website" document: a single "active" row in the `logos`
// table holds the live logo (logoUrl -> url, logoPath -> storage_path,
// updatedAt -> updated_at, updatedBy -> updated_by). Every component
// reads the logo through LogoProvider/Logo — nothing is hard-coded.
export const LOGO_COLLECTION = "logos";
export const LOGO_DOCUMENT_ID = "active";
export const LOGO_STORAGE_DIR = "website/logo";

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

export async function fetchActiveLogo(): Promise<LogoInfo | null> {
  try {
    const rows = await query<LogoRow[]>(
      "SELECT url, file_name, width, height, storage_path, updated_at, updated_by FROM logos WHERE id = ? LIMIT 1",
      [LOGO_DOCUMENT_ID],
    );
    const data = rows[0];
    if (!data) return null;
    const account = data.updated_by
      ? await fetchAdminAccount(data.updated_by)
      : null;
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
      updatedBy:
        account?.displayName ?? account?.email ?? (data.updated_by ?? null),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // If table missing, try to create it and retry once (self-heal on Interserver)
    if (msg.includes("doesn't exist") || msg.includes("Unknown table") || msg.includes("no such table")) {
      await ensureLogosTable();
      try {
        const rows = await query<LogoRow[]>(
          "SELECT url, file_name, width, height, storage_path, updated_at, updated_by FROM logos WHERE id = ? LIMIT 1",
          [LOGO_DOCUMENT_ID],
        );
        const data = rows[0];
        if (!data) return null;
        const updatedAt = Date.parse(parseDate(data.updated_at)) || 0;
        return {
          fileName: data.file_name,
          url: withCacheBust(data.url, updatedAt),
          width: typeof data.width === "number" && data.width > 0 ? data.width : DEFAULT_LOGO.width,
          height: typeof data.height === "number" && data.height > 0 ? data.height : DEFAULT_LOGO.height,
          updatedAt,
          updatedBy: data.updated_by ?? null,
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function saveActiveLogo(
  file: File,
  width: number,
  height: number,
  adminUid: string,
): Promise<LogoInfo> {
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${LOGO_STORAGE_DIR}/active-logo-${Date.now()}${extension}`;
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

  let previousStoragePath: string | null = null;
  try {
    const rows = await query<{ storage_path: string }[]>(
      "SELECT storage_path FROM logos WHERE id = ? LIMIT 1",
      [LOGO_DOCUMENT_ID],
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
    [LOGO_DOCUMENT_ID, cleanUrl, file.name, width, height, storagePath, adminUid],
  );

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

export async function removeActiveLogo(): Promise<void> {
  try {
    const rows = await query<{ storage_path: string }[]>(
      "SELECT storage_path FROM logos WHERE id = ? LIMIT 1",
      [LOGO_DOCUMENT_ID],
    );
    const storagePath: unknown = rows[0]?.storage_path;
    await query("DELETE FROM logos WHERE id = ?", [LOGO_DOCUMENT_ID]);
    if (typeof storagePath === "string" && isLocalUpload(storagePath)) {
      await removeFile(storagePath);
    }
  } catch {
    // The logo is either already gone or could not be removed.
  }
}