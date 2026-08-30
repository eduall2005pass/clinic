import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const hasAuth = auth.startsWith("Bearer ");
  let firebaseUser = null;
  let firebaseError: string | null = null;
  try {
    const { getFirebaseUser: gfu } = await import("@/lib/auth-api");
    firebaseUser = await gfu(request);
  } catch (e) {
    firebaseError = String(e).slice(0,120);
  }
  let dbCheck: Record<string, unknown> = {};
  try {
    const rows = await query<{ uid: string; email: string; role: string; is_active: number }[]>(
      "SELECT uid, email, role, is_active FROM admins LIMIT 5"
    );
    dbCheck = { count: rows.length, sample: rows[0] || null };
  } catch (e) {
    dbCheck = { error: String(e).slice(0,80) };
  }
  const envProjectId = process.env.FIREBASE_PROJECT_ID || null;
  const envNextProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null;
  return NextResponse.json({
    hasAuth,
    firebaseUser: firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email, email_verified: firebaseUser.email_verified } : null,
    firebaseError,
    dbCheck,
    envProjectId,
    envNextProjectId,
  });
}
