import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchAllMentors,
  saveMentors,
  saveMentorPhoto,
  deleteMentor,
  MAX_MENTOR_PHOTO_SIZE,
  ALLOWED_MENTOR_PHOTO_EXTENSIONS,
} from "@/lib/mentors";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 300;

export async function GET() {
  const mentors = await fetchAllMentors();
  return NextResponse.json(
    { mentors },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Bulk-save mentors (name/subject/note/order/visibility + profile fields).
 * Kept for compatibility with the existing admin UI.
 */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    mentors?: unknown;
  } | null;

  if (!body || !Array.isArray(body.mentors)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const mentors = await saveMentors(
      body.mentors as Array<Record<string, unknown>>,
      admin.uid,
    );
    return NextResponse.json({ mentors });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save mentors.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Create or update a single mentor with an optional photo upload. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  // Multipart — includes a photo file.
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const id = formData.get("id");
    const photo = formData.get("photo");
    if (typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Missing mentor id." }, { status: 400 });
    }
    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }
    const extension = photo.name.includes(".")
      ? `.${photo.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!(ALLOWED_MENTOR_PHOTO_EXTENSIONS as readonly string[]).includes(extension)) {
      return NextResponse.json(
        { error: "Unsupported photo type. Use PNG, JPG or WebP." },
        { status: 400 },
      );
    }
    if (photo.size > MAX_MENTOR_PHOTO_SIZE) {
      return NextResponse.json(
        { error: "Photo must be 5 MB or smaller." },
        { status: 400 },
      );
    }
    try {
      const mentors = await saveMentorPhoto(id.trim(), photo);
      return NextResponse.json({ mentors });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload the photo.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
}

/** Delete a mentor. */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Missing mentor id." }, { status: 400 });
  }
  const mentors = await deleteMentor(body.id);
  return NextResponse.json({ mentors });
}
