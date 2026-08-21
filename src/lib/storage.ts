import { randomUUID } from "node:crypto";
import { exec, query } from "@/lib/mysql";

// Uploads are stored in MySQL (uploads.data LONGBLOB) and served through
// /api/files/[id]. The serverless filesystem is ephemeral, so nothing may
// be written to disk — everything must live in the database.

export const UPLOADS_BASE_URL = "/api/files";

type MimeByExtension = Record<string, string>;

const MIME_BY_EXTENSION: MimeByExtension = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

function detectMimeType(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const extension = dot === -1 ? "" : fileName.slice(dot).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

async function ensureUploadsTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS uploads (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      directory VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(127) NOT NULL,
      size INT NOT NULL DEFAULT 0,
      data LONGBLOB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

export async function saveFile(
  directory: string,
  fileName: string,
  data: ArrayBuffer | Buffer,
): Promise<string> {
  const bytes =
    data instanceof ArrayBuffer ? Buffer.from(new Uint8Array(data)) : data;
  const id = randomUUID();
  await ensureUploadsTable();
  await exec(
    `INSERT INTO uploads (id, directory, file_name, mime_type, size, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, directory, fileName, detectMimeType(fileName), bytes.length, bytes],
  );
  return `${UPLOADS_BASE_URL}/${id}`;
}

function extractFileId(storagePath: string): string | null {
  if (!storagePath.startsWith(`${UPLOADS_BASE_URL}/`)) return null;
  const id = storagePath.slice(UPLOADS_BASE_URL.length + 1).split(/[?#]/)[0];
  return /^[0-9a-f-]{16,64}$/i.test(id) ? id : null;
}

export async function removeFile(storagePath: string): Promise<void> {
  const id = extractFileId(storagePath);
  if (!id) return; // Legacy /uploads/... paths have no DB row to delete.
  try {
    await exec("DELETE FROM uploads WHERE id = ?", [id]);
  } catch {
    // Best-effort cleanup.
  }
}

export function isLocalUpload(url: string): boolean {
  // Accepts "/api/files/<id>" URLs plus legacy relative storage paths
  // ("/uploads/...", "website/logo/...", "admin-content/...")
  // while rejecting external URLs (https://...).
  if (url.startsWith(`${UPLOADS_BASE_URL}/`)) return true;
  if (url.startsWith("https://")) return false;
  return url.includes("/") && !url.startsWith("http");
}

export async function fetchUpload(
  id: string,
): Promise<{ data: Buffer; mimeType: string; fileName: string } | null> {
  try {
    const rows = await query<
      { data: Buffer; mime_type: string; file_name: string }[]
    >(
      "SELECT data, mime_type, file_name FROM uploads WHERE id = ? LIMIT 1",
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      data: Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data),
      mimeType: row.mime_type || "application/octet-stream",
      fileName: row.file_name,
    };
  } catch {
    return null;
  }
}
