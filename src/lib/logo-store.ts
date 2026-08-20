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
    return {
      fileName: data.file_name,
      url: data.url,
      width:
        typeof data.width === "number" && data.width > 0
          ? data.width
          : DEFAULT_LOGO.width,
      height:
        typeof data.height === "number" && data.height > 0
          ? data.height
          : DEFAULT_LOGO.height,
      updatedAt: Date.parse(parseDate(data.updated_at)) || 0,
      updatedBy:
        account?.displayName ?? account?.email ?? (data.updated_by ?? null),
    };
  } catch {
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
  const url = await saveFile(
    LOGO_STORAGE_DIR,
    storagePath.split("/").pop() ?? "",
    await file.arrayBuffer(),
  );

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
    [LOGO_DOCUMENT_ID, url, file.name, width, height, storagePath, adminUid],
  );

  if (previousStoragePath) {
    await removeFile(previousStoragePath);
  }

  const account = await fetchAdminAccount(adminUid);
  return {
    fileName: file.name,
    url,
    width,
    height,
    updatedAt: Date.now(),
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