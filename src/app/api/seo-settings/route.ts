import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  fetchSeoSettings,
  normalizeSeoSettingsInput,
  saveSeoSettings,
} from "@/lib/seo-settings";
import { saveFile, removeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function GET() {
  const seo = await fetchSeoSettings();
  return NextResponse.json({ seo }, { headers: NO_CACHE_HEADERS });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let raw: Record<string, unknown>;
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    raw = {
      siteTitle: asString(formData.get("siteTitle")),
      metaDescription: asString(formData.get("metaDescription")),
      keywords: asString(formData.get("keywords")),
      ogTitle: asString(formData.get("ogTitle")),
      ogDescription: asString(formData.get("ogDescription")),
    };
    const rawImage = formData.get("ogImage");
    if (rawImage instanceof File && rawImage.size > 0) imageFile = rawImage;
  } else {
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }
    raw = body;
  }

  // Pre-validate image before touching DB to surface errors early.
  if (imageFile) {
    const extension = imageFile.name.includes(".")
      ? `.${imageFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Unsupported image file type. Use PNG, JPG, WebP or GIF." },
        { status: 400 },
      );
    }
    if (imageFile.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json(
        { error: "Social sharing image must be 5 MB or smaller." },
        { status: 400 },
      );
    }
  }

  try {
    const current = await fetchSeoSettings();
    const normalized = normalizeSeoSettingsInput(raw);

    let ogImageUrl = current.ogImageUrl;
    if (imageFile) {
      ogImageUrl = await saveFile("seo", imageFile.name, await imageFile.arrayBuffer());
    }

    const seo = await saveSeoSettings(
      { ...normalized, ogImageUrl },
      admin.uid,
    );

    if (imageFile && current.ogImageUrl && current.ogImageUrl !== seo.ogImageUrl) {
      await removeFile(current.ogImageUrl); // Best-effort cleanup of the old image.
    }

    return NextResponse.json({ seo }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save SEO settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("target") !== "og-image") {
    return NextResponse.json({ error: "Unknown target." }, { status: 400 });
  }
  try {
    const current = await fetchSeoSettings();
    const seo = await saveSeoSettings({ ...current, ogImageUrl: "" }, admin.uid);
    if (current.ogImageUrl) await removeFile(current.ogImageUrl);
    return NextResponse.json({ seo }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove the image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
