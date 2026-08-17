import { db, storage } from "@/lib/firebase";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";

export const LOGO_COLLECTION = "logos";
export const LOGO_DOCUMENT_ID = "active";
export const LOGO_STORAGE_DIR = "website-logos";

function logoDocumentRef() {
  return doc(db!, LOGO_COLLECTION, LOGO_DOCUMENT_ID);
}

export async function fetchActiveLogo(): Promise<LogoInfo | null> {
  if (!db) return null;
  try {
    const snapshot = await getDoc(logoDocumentRef());
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (typeof data.url !== "string" || typeof data.fileName !== "string") {
      return null;
    }
    const rawUpdatedAt: unknown = data.updatedAt;
    const updatedAt =
      typeof rawUpdatedAt === "number"
        ? rawUpdatedAt
        : typeof rawUpdatedAt === "object" &&
            rawUpdatedAt !== null &&
            typeof (rawUpdatedAt as { toMillis?: unknown }).toMillis ===
              "function"
          ? ((rawUpdatedAt as { toMillis: () => number }).toMillis())
          : 0;
    return {
      fileName: data.fileName,
      url: data.url,
      width:
        typeof data.width === "number" && data.width > 0
          ? data.width
          : DEFAULT_LOGO.width,
      height:
        typeof data.height === "number" && data.height > 0
          ? data.height
          : DEFAULT_LOGO.height,
      updatedAt,
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
  if (!db || !storage) {
    throw new Error("Firebase is not configured.");
  }
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const storagePath = `${LOGO_STORAGE_DIR}/active-logo-${Date.now()}${extension}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  let previousStoragePath: string | null = null;
  try {
    const previous = await getDoc(logoDocumentRef());
    const previousPath: unknown = previous.data()?.storagePath;
    if (
      typeof previousPath === "string" &&
      previousPath.startsWith(`${LOGO_STORAGE_DIR}/`)
    ) {
      previousStoragePath = previousPath;
    }
  } catch {
    // Keep going — cleaning up the old file is best-effort only.
  }

  await setDoc(logoDocumentRef(), {
    fileName: file.name,
    url,
    width,
    height,
    storagePath,
    updatedAt: serverTimestamp(),
  });

  if (previousStoragePath) {
    try {
      await deleteObject(ref(storage, previousStoragePath));
    } catch {
      // Best-effort cleanup of the previous file.
    }
  }

  return { fileName: file.name, url, width, height, updatedAt: Date.now() };
}

export async function removeActiveLogo(): Promise<void> {
  if (!db || !storage) return;
  try {
    const previous = await getDoc(logoDocumentRef());
    const previousStoragePath: unknown = previous.data()?.storagePath;
    await deleteDoc(logoDocumentRef());
    if (typeof previousStoragePath === "string") {
      try {
        await deleteObject(ref(storage, previousStoragePath));
      } catch {
        // Best-effort cleanup of the previous file.
      }
    }
  } catch {
    // The logo is either already gone or could not be removed.
  }
}
