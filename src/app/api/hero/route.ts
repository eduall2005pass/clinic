import { NextRequest, NextResponse } from "next/server";
import {
  fetchHeroSettings,
  saveHeroSettings,
  ALLOWED_HERO_IMAGE_EXTENSIONS,
  MAX_HERO_IMAGE_FILE_SIZE,
} from "@/lib/hero-settings";
import { requirePermission } from "@/lib/admin";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

function asString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

function asBool(value: FormDataEntryValue | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function GET() {
  const hero = await fetchHeroSettings();
  return NextResponse.json({ hero }, { headers: CACHE_HEADERS });
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form submission." },
      { status: 400 },
    );
  }

  const headline = asString(formData.get("headline"));
  const description = asString(formData.get("description"));
  const buttonText = asString(formData.get("button_text"));
  const buttonLink = asString(formData.get("button_link"));
  const isActive = asBool(formData.get("is_active"));
  const removeImage = asBool(formData.get("remove_image")) === true;

  if (buttonLink && buttonLink.length > 0) {
    const validLink =
      buttonLink.startsWith("/") ||
      buttonLink.startsWith("https://") ||
      buttonLink.startsWith("http://") ||
      buttonLink.startsWith("#") ||
      buttonLink.startsWith("mailto:");
    if (!validLink) {
      return NextResponse.json(
        { error: "Button link must be an internal path (/courses) or a full URL." },
        { status: 400 },
      );
    }
  }

  let imageFile: File | null = null;
  const rawImage = formData.get("image");
  if (rawImage instanceof File && rawImage.size > 0) {
    imageFile = rawImage;
    const extension = imageFile.name.includes(".")
      ? `.${imageFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (
      !ALLOWED_HERO_IMAGE_EXTENSIONS.includes(extension as never)
    ) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPG, WebP, GIF or SVG." },
        { status: 400 },
      );
    }
    if (imageFile.size > MAX_HERO_IMAGE_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image file must be 5 MB or smaller." },
        { status: 400 },
      );
    }
  }

  try {
    const hero = await saveHeroSettings(
      {
        headline,
        description,
        buttonText,
        buttonLink,
        isActive,
        imageFile,
        removeImage,
      },
      admin.uid,
    );
    return NextResponse.json({ hero }, { headers: CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save hero section.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const target = request.nextUrl.searchParams.get("target");
  if (target !== "image") {
    return NextResponse.json(
      { error: "Unknown delete target." },
      { status: 400 },
    );
  }
  try {
    const hero = await saveHeroSettings(
      { removeImage: true },
      admin.uid,
    );
    return NextResponse.json({ hero }, { headers: CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove the background image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
