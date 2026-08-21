import { FieldValue } from "firebase-admin/firestore";
import {
  getFirebaseAdminFirestore,
  isFirebaseAdminConfigured,
} from "@/lib/firebase-admin";
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

type BannerDoc = {
  slides?: unknown;
};

function parseUpdatedAt(raw: unknown): number {
  if (raw && typeof raw === "object" && typeof (raw as { toMillis?: unknown }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseSlides(raw: unknown): CustomBanner[] {
  if (!Array.isArray(raw)) return [];
  const slides: CustomBanner[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const slide = item as {
      id?: unknown;
      url?: unknown;
      href?: unknown;
      fileName?: unknown;
      storagePath?: unknown;
      updatedAt?: unknown;
    };
    if (typeof slide.id !== "string" || typeof slide.url !== "string") continue;
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
}

async function uploadBannerFile(
  file: File,
  storagePath: string,
): Promise<string> {
  // Interserver hosting: save to public/uploads/<dir>/<file> and return /uploads/... URL
  const fileName = storagePath.split("/").pop() ?? storagePath;
  const dir = storagePath.substring(0, storagePath.length - fileName.length - 1);
  return saveFile(dir || BANNER_STORAGE_DIR, fileName, await file.arrayBuffer());
}

async function deleteBannerFile(storagePath: string | null | undefined): Promise<void> {
  if (typeof storagePath !== "string" || storagePath.length === 0) return;
  // Legacy Firebase Storage URLs (https://firebasestorage.googleapis.com/...) are ignored
  // — they require Firebase Storage credentials which are no longer used.
  // Local uploads ("/uploads/..." or "website-banners/...") are deleted from public/uploads.
  if (storagePath.startsWith("https://")) return;
  try {
    await removeFile(storagePath);
  } catch {
    // Best-effort cleanup.
  }
}

export async function fetchCustomBanners(): Promise<CustomBanner[] | null> {
  if (!isFirebaseAdminConfigured) return null;
  try {
    const snapshot = await getFirebaseAdminFirestore()
      .doc(`${BANNER_COLLECTION}/${BANNER_DOCUMENT_ID}`)
      .get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() as BannerDoc | undefined;
    const slides = parseSlides(data?.slides);
    return slides.length > 0 ? slides : null;
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
  if (!isFirebaseAdminConfigured) {
    throw new Error("Firebase Storage is not configured.");
  }
  const extension = input.file.name.includes(".")
    ? `.${input.file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${BANNER_STORAGE_DIR}/${input.id}-${Date.now()}${extension}`;
  const url = await uploadBannerFile(input.file, storagePath);

  const previous = (await fetchCustomBanners()) ?? [];
  const previousSlide = previous.find((slide) => slide.id === input.id);

  const next: CustomBanner[] = [
    ...previous.filter((slide) => slide.id !== input.id),
    {
      id: input.id,
      url,
      href: input.href,
      fileName: input.file.name,
      storagePath,
      updatedAt: Date.now(),
    },
  ];

  await getFirebaseAdminFirestore()
    .doc(`${BANNER_COLLECTION}/${BANNER_DOCUMENT_ID}`)
    .set({
      slides: next,
      updatedAt: FieldValue.serverTimestamp(),
    });

  if (previousSlide?.storagePath && previousSlide.storagePath !== storagePath) {
    await deleteBannerFile(previousSlide.storagePath);
  }

  return next;
}

export async function removeCustomBanner(id: string): Promise<CustomBanner[]> {
  if (!isFirebaseAdminConfigured) return [];
  try {
    const previous = (await fetchCustomBanners()) ?? [];
    const removed = previous.find((slide) => slide.id === id);
    const next = previous.filter((slide) => slide.id !== id);
    const ref = getFirebaseAdminFirestore().doc(
      `${BANNER_COLLECTION}/${BANNER_DOCUMENT_ID}`,
    );
    if (next.length === 0) {
      await ref.delete();
    } else {
      await ref.set({ slides: next, updatedAt: FieldValue.serverTimestamp() });
    }
    if (removed?.storagePath) {
      await deleteBannerFile(removed.storagePath);
    }
    return next;
  } catch {
    return [];
  }
}