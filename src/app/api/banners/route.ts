import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchActiveBanners,
  fetchAllBanners,
  removeCustomBanner,
  saveCustomBanner,
  updateBannerMeta,
  reorderBanners,
  type BannerMetaPatch,
} from "@/lib/banner-store";
import { parseImageDimensions } from "@/lib/image-dimensions";
import {
  ALLOWED_BANNER_EXTENSIONS,
  MAX_BANNER_FILE_SIZE,
} from "@/lib/banners";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    const admin = await requirePermission(request, "manageContent");
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const slides = await fetchAllBanners();
    return NextResponse.json({ slides });
  }
  const slides = await fetchActiveBanners();
  return NextResponse.json({ slides });
}

function validateFile(file: File): string | null {
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : "";
  if (!(ALLOWED_BANNER_EXTENSIONS as readonly string[]).includes(extension as never)) {
    return "Unsupported file type. Use PNG, JPG, WebP, GIF or SVG.";
  }
  if (file.size > MAX_BANNER_FILE_SIZE) {
    return "Banner file must be 5 MB or smaller.";
  }
  return null;
}

/** Add a new banner or replace an existing banner image. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rawId = formData.get("id");
  const rawHref = formData.get("href");
  const rawTitle = formData.get("title");
  const rawStartAt = formData.get("start_at");
  const rawEndAt = formData.get("end_at");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No banner file provided." },
      { status: 400 },
    );
  }
  const fileError = validateFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const href =
    typeof rawHref === "string" && rawHref.trim().length > 0
      ? rawHref.trim()
      : null;
  const title =
    typeof rawTitle === "string" && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : null;

  // New banners may omit the id — one is generated server-side.
  const id =
    typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : undefined;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
      : ".png";
    const { width, height } = parseImageDimensions(bytes, extension);
    const slides = await saveCustomBanner({
      file,
      id,
      href,
      title,
      width,
      height,
      startAt: typeof rawStartAt === "string" ? rawStartAt : null,
      endAt: typeof rawEndAt === "string" ? rawEndAt : null,
    });
    return NextResponse.json({ slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the banner.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Update banner meta (title/link/active) and/or reorder banners. */
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
    let slides = await fetchAllBanners();

    if (Array.isArray(body.updates)) {
      for (const raw of body.updates) {
        const entry = raw as Record<string, unknown>;
        if (typeof entry.id !== "string" || entry.id.length === 0) continue;
        const patch: BannerMetaPatch = {};
        if (typeof entry.title === "string" || entry.title === null) {
          patch.title = entry.title as string | null;
        }
        if (typeof entry.href === "string" || entry.href === null) {
          patch.href = entry.href as string | null;
        }
        if (typeof entry.isActive === "boolean") {
          patch.isActive = entry.isActive;
        }
        if (typeof entry.startAt === "string" || entry.startAt === null) {
          patch.startAt = entry.startAt as string | null;
        }
        if (typeof entry.endAt === "string" || entry.endAt === null) {
          patch.endAt = entry.endAt as string | null;
        }
        slides = await updateBannerMeta(entry.id, patch);
      }
    }

    if (
      Array.isArray(body.order) &&
      body.order.every((item) => typeof item === "string")
    ) {
      slides = await reorderBanners(body.order as string[]);
    }

    return NextResponse.json({ slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the banners.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = body?.id;
  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json(
      { error: "Missing banner id." },
      { status: 400 },
    );
  }
  const slides = await removeCustomBanner(id);
  return NextResponse.json({ slides });
}
