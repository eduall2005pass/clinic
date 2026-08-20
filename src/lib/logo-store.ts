import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";
import { FieldValue } from "firebase-admin/firestore";
import {
  getFirebaseAdminFirestore,
  getFirebaseAdminStorage,
  isFirebaseAdminConfigured,
  resolveStorageBucket,
} from "@/lib/firebase-admin";
import { fetchAdminAccount } from "@/lib/admin";

// Centralized website settings: Firestore document `settings/website`
// holds the active logo configuration (logoUrl, logoPath, fileName,
// width, height, updatedAt, updatedBy). Every component reads the logo
// through LogoProvider/Logo — nothing is hard-coded.
export const SETTINGS_COLLECTION = "settings";
export const SETTINGS_DOCUMENT_ID = "website";
export const LOGO_STORAGE_DIR = "website/logo";

export const getActiveLogo = fetchActiveLogo;

type SettingsData = {
  logoUrl?: unknown;
  logoPath?: unknown;
  fileName?: unknown;
  width?: unknown;
  height?: unknown;
  updatedAt?: unknown;
  updatedBy?: unknown;
};

function parseMillis(raw: unknown): number {
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

export async function fetchActiveLogo(): Promise<LogoInfo | null> {
  if (!isFirebaseAdminConfigured) return null;
  try {
    const snapshot = await getFirebaseAdminFirestore()
      .doc(`${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT_ID}`)
      .get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() as SettingsData | undefined;
    if (!data || typeof data.logoUrl !== "string" || data.logoUrl.length === 0) {
      return null;
    }
    return {
      fileName: typeof data.fileName === "string" ? data.fileName : "logo",
      url: data.logoUrl,
      width:
        typeof data.width === "number" && data.width > 0
          ? data.width
          : DEFAULT_LOGO.width,
      height:
        typeof data.height === "number" && data.height > 0
          ? data.height
          : DEFAULT_LOGO.height,
      updatedAt: parseMillis(data.updatedAt),
      updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    };
  } catch {
    return null;
  }
}

function buildDownloadUrl(bucket: string, path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

async function uploadLogoFile(
  buffer: Buffer,
  contentType: string,
  fileName: string,
): Promise<{ url: string; path: string; bucket: string }> {
  const storage = getFirebaseAdminStorage();
  const bucketName = resolveStorageBucket();
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const path = `${LOGO_STORAGE_DIR}/${fileName}`;
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  return { url: buildDownloadUrl(file.bucket.name, path), path, bucket: file.bucket.name };
}

async function deleteLogoFile(path: string | null | undefined): Promise<void> {
  if (typeof path !== "string" || path.length === 0) return;
  try {
    const storage = getFirebaseAdminStorage();
    const bucketName = resolveStorageBucket();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    await bucket.file(path).delete();
  } catch {
    // Best-effort cleanup — an old file that fails to delete must not
    // break the logo update.
  }
}

export async function saveActiveLogo(
  file: File,
  width: number,
  height: number,
  adminUid: string,
): Promise<LogoInfo> {
  if (!isFirebaseAdminConfigured) {
    throw new Error("Firebase Storage is not configured.");
  }

  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const fileName = `active-logo-${Date.now()}${extension}`;

  const { url, path } = await uploadLogoFile(
    Buffer.from(await file.arrayBuffer()),
    file.type || "application/octet-stream",
    fileName,
  );

  const firestore = getFirebaseAdminFirestore();
  const settingsRef = firestore.doc(
    `${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT_ID}`,
  );

  let previousLogoPath: string | null | undefined;
  try {
    const previous = await settingsRef.get();
    const rawPath = (previous.data() as SettingsData | undefined)?.logoPath;
    previousLogoPath = typeof rawPath === "string" ? rawPath : null;
  } catch {
    previousLogoPath = null;
  }

  try {
    await settingsRef.set({
      logoUrl: url,
      logoPath: path,
      fileName: file.name,
      width,
      height,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    });
  } catch {
    await deleteLogoFile(path);
    throw new Error(
      "The logo file uploaded, but saving its settings failed. Your previous logo is unchanged.",
    );
  }

  if (typeof previousLogoPath === "string" && previousLogoPath !== path) {
    await deleteLogoFile(previousLogoPath);
  }

  const account = await fetchAdminAccount(adminUid);
  return {
    fileName: file.name,
    url,
    width,
    height,
    updatedAt: Date.now(),
    updatedBy: account?.displayName ?? account?.email ?? adminUid,
  };
}

export async function removeActiveLogo(): Promise<void> {
  if (!isFirebaseAdminConfigured) return;
  const firestore = getFirebaseAdminFirestore();
  const settingsRef = firestore.doc(
    `${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT_ID}`,
  );
  try {
    const snapshot = await settingsRef.get();
    if (snapshot.exists) {
      const rawPath = (snapshot.data() as SettingsData | undefined)?.logoPath;
      await settingsRef.delete();
      if (typeof rawPath === "string") {
        await deleteLogoFile(rawPath);
      }
    }
  } catch {
    // The logo is either already gone or could not be removed.
  }
}