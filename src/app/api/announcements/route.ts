import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchActiveAnnouncements,
  fetchAllAnnouncements,
  saveAnnouncement,
  setAnnouncementActive,
  reorderAnnouncements,
  deleteAnnouncement,
} from "@/lib/announcements";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

export async function GET() {
  const announcements = await fetchActiveAnnouncements();
  return NextResponse.json({ announcements });
}

/** Create or update an announcement. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title : "";
  if (title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const announcements = await saveAnnouncement({
      id: typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : undefined,
      title,
      description: typeof body.description === "string" ? body.description : null,
      buttonText: typeof body.button_text === "string" ? body.button_text : null,
      buttonHref: typeof body.button_href === "string" ? body.button_href : null,
      isActive: body.is_active === true || body.is_active === "true" || body.is_active === "1",
      startAt: typeof body.start_at === "string" ? body.start_at : null,
      endAt: typeof body.end_at === "string" ? body.end_at : null,
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the announcement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Enable/disable announcements and/or change display order. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    order?: unknown;
    updates?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    let announcements = await fetchAllAnnouncements();

    if (Array.isArray(body.updates)) {
      for (const raw of body.updates) {
        const entry = raw as Record<string, unknown>;
        if (typeof entry.id !== "string" || entry.id.length === 0) continue;
        if (typeof entry.isActive === "boolean") {
          announcements = await setAnnouncementActive(entry.id, entry.isActive);
        }
      }
    }

    if (
      Array.isArray(body.order) &&
      body.order.every((item) => typeof item === "string")
    ) {
      announcements = await reorderAnnouncements(body.order as string[]);
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the announcements.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Missing announcement id." }, { status: 400 });
  }
  const announcements = await deleteAnnouncement(body.id);
  return NextResponse.json({ announcements });
}
