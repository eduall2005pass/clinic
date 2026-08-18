import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Resolves the Firebase-authenticated user from a request's
 * Authorization header (Bearer token). Returns null when the token
 * is missing or invalid.
 */
export async function getFirebaseUser(
  request: NextRequest,
): Promise<DecodedIdToken | null> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  return verifyFirebaseToken(token);
}