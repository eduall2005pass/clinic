import { query } from "@/lib/mysql";
import { saveFile, removeFile } from "@/lib/storage";

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
  try {
    const rows = await query<{ slides: string | null }[]>(
      "SELECT slides FROM banners WHERE id = ? LIMIT 1",
      [BANNER_DOCUMENT_ID],
    );
    const rawSlides: unknown = rows[0]?.slides;
    if (typeof rawSlides !== "string" || rawSlides.length === 0) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawSlides);
    } catch {
      return null;
    }
    if (!Array.isArray(parsed)) return null;
    const slides: CustomBanner[] = [];
    for (const raw of parsed) {
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
  const extension = input.file.name.includes(".")
    ? `.${input.file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${BANNER_STORAGE_DIR}/${input.id}-${Date.now()}${extension}`;
  const url = await saveFile(
    BANNER_STORAGE_DIR,
    storagePath.split("/").pop() ?? "",
    await input.file.arrayBuffer(),
  );

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

  await query(
    `INSERT INTO banners (id, slides, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
      slides = VALUES(slides),
      updated_at = NOW()`,
    [BANNER_DOCUMENT_ID, JSON.stringify(next)],
  );

  if (previousSlide?.storagePath) {
    await removeFile(previousSlide.storagePath);
  }

  return next;
}

export async function removeCustomBanner(id: string): Promise<CustomBanner[]> {
  try {
    const previous = await fetchCustomBanners();
    if (!previous) return [];
    const removed = previous.find((slide) => slide.id === id);
    const next = previous.filter((slide) => slide.id !== id);
    if (next.length === 0) {
      await query("DELETE FROM banners WHERE id = ?", [BANNER_DOCUMENT_ID]);
    } else {
      await query(
        `INSERT INTO banners (id, slides, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE
          slides = VALUES(slides),
          updated_at = NOW()`,
        [BANNER_DOCUMENT_ID, JSON.stringify(next)],
      );
    }
    if (removed?.storagePath) {
      await removeFile(removed.storagePath);
    }
    return next;
  } catch {
    return [];
  }
}
