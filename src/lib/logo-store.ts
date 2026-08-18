import { supabaseServer, storagePublicUrl } from "@/lib/supabase";
import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";

export const LOGO_COLLECTION = "logos";
export const LOGO_DOCUMENT_ID = "active";
export const LOGO_STORAGE_DIR = "website-logos";

/**
 * Server-friendly alias used by server components (e.g. layout.tsx)
 * to resolve the active logo before rendering.
 */
export const getActiveLogo = fetchActiveLogo;

export async function fetchActiveLogo(): Promise<LogoInfo | null> {
  if (!supabaseServer) return null;
  try {
    const { data, error } = await supabaseServer
      .from("logos")
      .select("url, file_name, width, height, updated_at")
      .eq("id", LOGO_DOCUMENT_ID)
      .maybeSingle();
    if (error || !data) return null;
    const rawUpdatedAt: unknown = data.updated_at;
    const updatedAt =
      typeof rawUpdatedAt === "number"
        ? rawUpdatedAt
        : typeof rawUpdatedAt === "string"
          ? Date.parse(rawUpdatedAt)
          : 0;
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
      updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
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
  if (!supabaseServer) {
    throw new Error("Supabase is not configured.");
  }
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${LOGO_STORAGE_DIR}/active-logo-${Date.now()}${extension}`;
  const bucket = supabaseServer.storage.from(LOGO_STORAGE_DIR);
  const { error: uploadError } = await bucket.upload(storagePath, file);
  if (uploadError) {
    throw new Error(uploadError.message);
  }
  const url = storagePublicUrl(LOGO_STORAGE_DIR, storagePath);

  let previousStoragePath: string | null = null;
  try {
    const { data } = await supabaseServer
      .from("logos")
      .select("storage_path")
      .eq("id", LOGO_DOCUMENT_ID)
      .maybeSingle();
    const previousPath: unknown = data?.storage_path;
    if (
      typeof previousPath === "string" &&
      previousPath.startsWith(`${LOGO_STORAGE_DIR}/`)
    ) {
      previousStoragePath = previousPath;
    }
  } catch {
    // Keep going — cleaning up the old file is best-effort only.
  }

  const { error: dbError } = await supabaseServer.from("logos").upsert({
    id: LOGO_DOCUMENT_ID,
    url,
    file_name: file.name,
    width,
    height,
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  });
  if (dbError) {
    throw new Error(dbError.message);
  }

  if (previousStoragePath) {
    try {
      await bucket.remove([previousStoragePath]);
    } catch {
      // Best-effort cleanup of the previous file.
    }
  }

  return { fileName: file.name, url, width, height, updatedAt: Date.now() };
}

export async function removeActiveLogo(): Promise<void> {
  if (!supabaseServer) return;
  try {
    const { data } = await supabaseServer
      .from("logos")
      .select("storage_path")
      .eq("id", LOGO_DOCUMENT_ID)
      .maybeSingle();
    const { error } = await supabaseServer
      .from("logos")
      .delete()
      .eq("id", LOGO_DOCUMENT_ID);
    if (error) throw error;
    if (typeof data?.storage_path === "string") {
      try {
        await supabaseServer.storage
          .from(LOGO_STORAGE_DIR)
          .remove([data.storage_path]);
      } catch {
        // Best-effort cleanup of the previous file.
      }
    }
  } catch {
    // The logo is either already gone or could not be removed.
  }
}