import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "";

function getServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.length > 0) {
    return JSON.parse(rawJson) as Record<string, string>;
  }
  if (serviceAccountPath.length > 0) {
    try {
      return JSON.parse(
        readFileSync(serviceAccountPath, "utf8"),
      ) as Record<string, string>;
    } catch {
      return null;
    }
  }
  return null;
}

const serviceAccount = getServiceAccount();

export const isFirebaseAdminConfigured = serviceAccount !== null;

export function getFirebaseAdminAuth() {
  if (!serviceAccount) {
    throw new Error("Firebase Admin is not configured.");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    });
  }
  return getAuth();
}

/**
 * Verifies a Firebase ID token and returns the decoded claims, or null
 * when the token is missing or invalid.
 */
export async function verifyFirebaseToken(
  token: string | null | undefined,
): Promise<DecodedIdToken | null> {
  if (!token || token.length === 0 || !isFirebaseAdminConfigured) {
    return null;
  }
  try {
    return await getFirebaseAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}