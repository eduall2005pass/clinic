import { mkdir, writeFile, rm, access } from "node:fs/promises";
import path from "node:path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export const UPLOADS_BASE_URL = "/uploads";

export async function saveFile(
  directory: string,
  fileName: string,
  data: ArrayBuffer | Buffer,
): Promise<string> {
  const dirPath = path.join(UPLOADS_ROOT, directory);
  await mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, fileName);
  await writeFile(
    filePath,
    data instanceof ArrayBuffer ? new Uint8Array(data) : data,
  );
  return `${UPLOADS_BASE_URL}/${directory}/${fileName}`;
}

export async function removeFile(storagePath: string): Promise<void> {
  const relative = storagePath.replace(UPLOADS_BASE_URL, "");
  const safe = relative.replace(/^[/\\]+/, "");
  if (!safe || safe.includes("..")) return;
  const filePath = path.join(UPLOADS_ROOT, safe);
  try {
    await access(filePath);
    await rm(filePath, { force: true });
  } catch {
    // File is either already gone or could not be removed.
  }
}

export function isLocalUpload(url: string): boolean {
  // Accepts both "/uploads/..." URLs and raw relative paths like "website/logo/..." or "admin-content/..."
  // while rejecting legacy Firebase Storage URLs (https://firebasestorage.googleapis.com/...)
  if (url.startsWith(`${UPLOADS_BASE_URL}/`)) return true;
  if (url.startsWith("https://")) return false;
  // Local relative paths used as storage_path in DB (e.g. "website/logo/active-logo-...png", "admin-content/mentors/...")
  return url.includes("/") && !url.startsWith("http");
}
