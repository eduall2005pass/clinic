import { NextRequest } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import {
  getFirebaseAdminFirestore,
  isFirebaseAdminConfigured,
} from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export type AdminAccount = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

/**
 * Authorized admin accounts live in the Firestore `admins` collection
 * (document ID = Firebase UID). This is the single source of truth —
 * verified from Firestore, never from hard-coded frontend values.
 * Documents are provisioned manually (or by the project owner); the
 * Firestore security rules forbid clients from creating or editing them.
 */
export async function isAdminUid(uid: string): Promise<boolean> {
  if (!isFirebaseAdminConfigured) return false;
  try {
    const document = await getFirebaseAdminFirestore()
      .doc(`admins/${uid}`)
      .get();
    return document.exists;
  } catch {
    return false;
  }
}

export async function fetchAdminAccount(
  uid: string,
): Promise<AdminAccount | null> {
  if (!isFirebaseAdminConfigured) return null;
  try {
    const document = await getFirebaseAdminFirestore()
      .doc(`admins/${uid}`)
      .get();
    if (!document.exists) return null;
    const data = document.data() ?? {};
    return {
      uid,
      email:
        typeof data.email === "string" && data.email.length > 0
          ? data.email
          : null,
      displayName:
        typeof data.displayName === "string" && data.displayName.length > 0
          ? data.displayName
          : null,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies the caller is an authenticated, authorized admin.
 * Returns the decoded token on success, null otherwise.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<DecodedIdToken | null> {
  const user = await getFirebaseUser(request);
  if (!user) return null;
  return (await isAdminUid(user.uid)) ? user : null;
}