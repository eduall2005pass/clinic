import { db, storage } from "@/lib/firebase";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

function bannerDocumentRef() {
  return doc(db!, BANNER_COLLECTION, BANNER_DOCUMENT_ID);
}

function parseUpdatedAt(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (
    typeof raw === "object" &&
    raw !== null &&
    typeof (raw as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export async function fetchCustomBanners(): Promise<CustomBanner[] | null> {
  if (!db) return null;
  try {
    const snapshot = await getDoc(bannerDocumentRef());
    if (!snapshot.exists()) return null;
    const rawSlides: unknown = snapshot.data().slides;
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
  if (!db || !storage) {
    throw new Error("Firebase is not configured.");
  }
  const extension = input.file.name.includes(".")
    ? `.${input.file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${BANNER_STORAGE_DIR}/${input.id}-${Date.now()}${extension}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, input.file);
  const url = await getDownloadURL(fileRef);

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

  await setDoc(bannerDocumentRef(), {
    slides: next,
    updatedAt: serverTimestamp(),
  });

  if (previousSlide?.storagePath) {
    try {
      await deleteObject(ref(storage, previousSlide.storagePath));
    } catch {
      // Best-effort cleanup of the previous file.
    }
  }

  return next;
}

export async function removeCustomBanner(id: string): Promise<CustomBanner[]> {
  if (!db || !storage) return [];
  try {
    const previous = await fetchCustomBanners();
    if (!previous) return [];
    const removed = previous.find((slide) => slide.id === id);
    const next = previous.filter((slide) => slide.id !== id);
    if (next.length === 0) {
      await deleteDoc(bannerDocumentRef());
    } else {
      await setDoc(bannerDocumentRef(), {
        slides: next,
        updatedAt: serverTimestamp(),
      });
    }
    if (removed?.storagePath) {
      try {
        await deleteObject(ref(storage, removed.storagePath));
      } catch {
        // Best-effort cleanup of the removed file.
      }
    }
    return next;
  } catch {
    return [];
  }
}