import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, fetchAdminAccount } from "@/lib/admin";
import {
  fetchAdminProfile,
  updateAdminProfile,
  saveAdminPhoto,
  fetchLoginActivity,
  fetchAdminRole,
  fetchLastLogin,
} from "@/lib/admin-profile";

export const dynamic = "force-dynamic";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (request.nextUrl.searchParams.get("loginActivity") === "1") {
    const activity = await fetchLoginActivity(admin.uid);
    return NextResponse.json({ activity });
  }
  let profile = await fetchAdminProfile(admin.uid);
  if (!profile) {
    const account = await fetchAdminAccount(admin.uid);
    profile = {
      uid: admin.uid,
      email: account?.email ?? admin.email ?? null,
      displayName: account?.displayName ?? admin.name ?? null,
      photoUrl: null,
      phoneNumber: null,
    };
  }
  return NextResponse.json(
    {
      profile,
      status: "active",
      role: await fetchAdminRole(profile.email),
      lastLoginAt: await fetchLastLogin(admin.uid),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Update display name / phone number. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { displayName?: unknown; phoneNumber?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const profile = await updateAdminProfile(admin.uid, body);
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Multipart upload of the profile picture (field name: photo). */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Unsupported content type." },
      { status: 400 },
    );
  }
  const formData = await request.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "No photo provided." }, { status: 400 });
  }
  const extension = photo.name.includes(".")
    ? `.${photo.name.split(".").pop()?.toLowerCase() ?? ""}`
    : "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { error: "Unsupported photo type. Use PNG, JPG or WebP." },
      { status: 400 },
    );
  }
  if (photo.size > MAX_PHOTO_SIZE) {
    return NextResponse.json(
      { error: "Photo must be 5 MB or smaller." },
      { status: 400 },
    );
  }
  try {
    const profile = await saveAdminPhoto(admin.uid, photo);
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload the photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
