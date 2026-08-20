import { query, parseDate } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";
import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";

export const LOGO_COLLECTION = "logos";
export const LOGO_DOCUMENT_ID = "active";
export const LOGO_STORAGE_DIR = "website-logos";

type LogoRow = {
  url: string;
  file_name: string;
  width: number;
  height: number;
  storage_path: string;
  updated_at: Date | string;
};

export const getActiveLogo = fetchActiveLogo;

export async function fetchActiveLogo(): Promise<LogoInfo | null> {
  try {
    const rows = await query<LogoRow[]>(
      "SELECT url, file_name, width, height, storage_path, updated_at FROM logos WHERE id = ? LIMIT 1",
      [LOGO_DOCUMENT_ID],
    );
    const data = rows[0];
    if (!data) return null;
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
    };
  } catch {
    return null;
  }
}

export async function saveActiveLogo(
  file: File,
  width: number,
  height: number,
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
      (id, url, file_name, width, height, storage_path, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
      url = VALUES(url),
      file_name = VALUES(file_name),
      width = VALUES(width),
      height = VALUES(height),
      storage_path = VALUES(storage_path),
      updated_at = NOW()`,
    [LOGO_DOCUMENT_ID, url, file.name, width, height, storagePath],
  );

  if (previousStoragePath) {
    await removeFile(previousStoragePath);
  }

  return { fileName: file.name, url, width, height, updatedAt: Date.now() };
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
