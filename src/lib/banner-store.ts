import { supabaseServer, storagePublicUrl } from "@/lib/supabase";

export const BANNER_COLLECTION = "banners";
export const BANNER_DOCUMENT_ID = "active";
export const BANNER_STORAGE_DIR = "website-banners";

export type CustomBanner = {
  id: string;
  url: string;
  href: string | null;
  fileName: string;
  storagePath: string;
  updatedAt: number;
};

function parseUpdatedAt(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function fetchCustomBanners(): Promise<CustomBanner[] | null> {
  if (!supabaseServer) return null;
  try {
    const { data, error } = await supabaseServer
      .from("banners")
      .select("slides")
      .eq("id", BANNER_DOCUMENT_ID)
      .maybeSingle();
    if (error || !data) return null;
    const rawSlides: unknown = data.slides;
    if (!Array.isArray(rawSlides)) return null;
    const slides: CustomBanner[] = [];
    for (const raw of rawSlides) {
      if (
        typeof raw !== "object" ||
        raw === null ||
        typeof (raw as { id?: unknown }).id !== "string" ||
        typeof (raw as { url?: unknown }).url !== "string"
      ) {
        continue;
      }
      const slide = raw as {
        id: string;
        url: string;
        href?: unknown;
        fileName?: unknown;
        storagePath?: unknown;
        updatedAt?: unknown;
      };
      slides.push({
        id: slide.id,
        url: slide.url,
        href:
          typeof slide.href === "string" && slide.href.length > 0
            ? slide.href
            : null,
        fileName: typeof slide.fileName === "string" ? slide.fileName : "",
        storagePath:
          typeof slide.storagePath === "string" ? slide.storagePath : "",
        updatedAt: parseUpdatedAt(slide.updatedAt),
      });
    }
    return slides;
  } catch {
    return null;
  }
}

export async function saveCustomBanner(input: {
  file: File;
  id: string;
  href: string | null;
  width: number;
  height: number;
}): Promise<CustomBanner[]> {
  if (!supabaseServer) {
    throw new Error("Supabase is not configured.");
  }
  const extension = input.file.name.includes(".")
    ? `.${input.file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${BANNER_STORAGE_DIR}/${input.id}-${Date.now()}${extension}`;
  const fileRef = supabaseServer.storage.from(BANNER_STORAGE_DIR);
  const { error: uploadError } = await fileRef.upload(storagePath, input.file);
  if (uploadError) {
    throw new Error(uploadError.message);
  }
  const url = storagePublicUrl(BANNER_STORAGE_DIR, storagePath);

  const previous = await fetchCustomBanners();
  const previousSlide = previous?.find((slide) => slide.id === input.id);

  const next: CustomBanner[] = [
    ...(previous ?? []).filter((slide) => slide.id !== input.id),
    {
      id: input.id,
      url,
      href: input.href,
      fileName: input.file.name,
      storagePath,
      updatedAt: Date.now(),
    },
  ];

  const { error: dbError } = await supabaseServer.from("banners").upsert({
    id: BANNER_DOCUMENT_ID,
    slides: next,
    updated_at: new Date().toISOString(),
  });
  if (dbError) {
    throw new Error(dbError.message);
  }

  if (previousSlide?.storagePath) {
    try {
      await fileRef.remove([previousSlide.storagePath]);
    } catch {
      // Best-effort cleanup of the previous file.
    }
  }

  return next;
}

export async function removeCustomBanner(id: string): Promise<CustomBanner[]> {
  if (!supabaseServer) return [];
  try {
    const previous = await fetchCustomBanners();
    if (!previous) return [];
    const removed = previous.find((slide) => slide.id === id);
    const next = previous.filter((slide) => slide.id !== id);
    if (next.length === 0) {
      const { error } = await supabaseServer
        .from("banners")
        .delete()
        .eq("id", BANNER_DOCUMENT_ID);
      if (error) throw error;
    } else {
      const { error } = await supabaseServer.from("banners").upsert({
        id: BANNER_DOCUMENT_ID,
        slides: next,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    if (removed?.storagePath) {
      try {
        await supabaseServer.storage
          .from(BANNER_STORAGE_DIR)
          .remove([removed.storagePath]);
      } catch {
        // Best-effort cleanup of the removed file.
      }
    }
    return next;
  } catch {
    return [];
  }
}