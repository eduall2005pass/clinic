import { randomUUID } from "node:crypto";
import { exec, query } from "@/lib/mysql";

// Media files live on the Azure VM's disk under /var/www/medispark-uploads
// and are served over HTTPS by nginx at MEDIA_FILES_BASE_URL. saveFile()
// forwards bytes to the VM's upload endpoint; only the returned URL is kept.
// The uploads table (LONGBLOB) is legacy — /api/files/[id] still serves old
// rows so nothing breaks, but new writes never touch the database.

export const UPLOADS_BASE_URL = "/api/files";

const MEDIA_FILES_BASE_URL =
  process.env.MEDIA_FILES_BASE_URL ?? "https://medispark.duckdns.org/medifiles";
const MEDIA_UPLOAD_URL =
  process.env.MEDIA_UPLOAD_URL ?? "https://medispark.duckdns.org/medifiles-upload";
const MEDIA_DELETE_URL =
  process.env.MEDIA_DELETE_URL ?? "https://medispark.duckdns.org/medifiles-delete";

function mediaToken(): string {
  const token = (process.env.MEDIA_UPLOAD_TOKEN ?? "").trim();
  if (!token) {
    throw new Error(
      "MEDIA_UPLOAD_TOKEN is not configured — set it in the environment to upload media files.",
    );
  }
  return token;
}

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
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".wav": "audio/wav",
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

  const endpoint = new URL(MEDIA_UPLOAD_URL);
  endpoint.searchParams.set("dir", directory);
  endpoint.searchParams.set("name", fileName || `file-${randomUUID()}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": detectMimeType(fileName),
      "X-Medifiles-Token": mediaToken(),
    },
    body: new Uint8Array(bytes),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Media upload failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const result = (await response.json()) as { url?: string };
  if (!result.url) throw new Error("Media upload returned no URL");

  return `${MEDIA_FILES_BASE_URL}/${result.url.replace(/^\/medifiles\//, "")}`;
}

function extractLegacyFileId(storagePath: string): string | null {
  if (!storagePath.startsWith(`${UPLOADS_BASE_URL}/`)) return null;
  const id = storagePath.slice(UPLOADS_BASE_URL.length + 1).split(/[?#]/)[0];
  return /^[0-9a-f-]{16,64}$/i.test(id) ? id : null;
}

function extractMediaPath(url: string): string | null {
  const marker = "/medifiles/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split(/[?#]/)[0];
}

export async function removeFile(storagePath: string): Promise<void> {
  if (!storagePath || typeof storagePath !== "string") return;

  const mediaPath = extractMediaPath(storagePath);
  const isVmUrl = storagePath.startsWith(MEDIA_FILES_BASE_URL);
  const isRelativeVmPath =
    !storagePath.startsWith("http") &&
    !storagePath.startsWith("/") &&
    /^[A-Za-z0-9._-]+\/[A-Za-z0-9._\/-]+$/.test(storagePath.split(/[?#]/)[0]) &&
    mediaPath === null;

  // Case 1: full VM URL (e.g. https://medispark.duckdns.org/medifiles/...)
  if (mediaPath && isVmUrl) {
    try {
      await fetch(MEDIA_DELETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Medifiles-Token": mediaToken(),
        },
        body: JSON.stringify({ url: storagePath }),
      });
    } catch {
      // Best-effort cleanup.
    }
    return;
  }

  // Relative medifiles path (e.g. "website/logo/<uuid>.png") — reconstruct full URL
  if (
    !storagePath.startsWith("/") &&
    !storagePath.startsWith("http") &&
    storagePath.includes("/") &&
    /^[A-Za-z0-9_\-/]+\.[A-Za-z0-9]{1,8}$/.test(storagePath)
  ) {
    const fullUrl = `${MEDIA_FILES_BASE_URL}/${storagePath.replace(/^\/+/, "")}`;
    try {
      await fetch(MEDIA_DELETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Medifiles-Token": mediaToken(),
        },
        body: JSON.stringify({ url: fullUrl }),
      });
    } catch {
      // Best-effort cleanup.
    }
    return;
  }

  // Legacy DB blob.
  const id = extractLegacyFileId(storagePath);
  if (!id) return;
  try {
    await exec("DELETE FROM uploads WHERE id = ?", [id]);
  } catch {
    // Best-effort cleanup.
  }
}

export function isLocalUpload(url: string): boolean {
  // Accepts VM-hosted media URLs, "/api/files/<id>" legacy URLs and legacy
  // relative VM paths (e.g. "website/logo/...", "course-images/...") while
  // rejecting external URLs (other https://... hosts).
  if (!url || typeof url !== "string") return false;
  if (url.startsWith(`${MEDIA_FILES_BASE_URL}/`)) return true;
  if (url.startsWith(`${UPLOADS_BASE_URL}/`)) return true;
  if (url.startsWith("https://") || url.startsWith("http://")) return false;
  // Relative VM path: at least one slash, looks like a storage dir
  // Covers "website/logo/...", "course-images/...", "media-library/..." etc.
  return /^[A-Za-z0-9._-]+\/[A-Za-z0-9._\/-]+$/.test(url.split(/[?#]/)[0]);
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
