import { readFileSync } from "node:fs";
import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "";

function getServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.length > 0) {
    return JSON.parse(rawJson) as Record<string, string>;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
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

export function getFirebaseAdminApp(): App {
  if (!serviceAccount) {
    throw new Error("Firebase Admin is not configured.");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    });
  }
  return getApps()[0];
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
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