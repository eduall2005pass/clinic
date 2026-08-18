import { NextRequest, NextResponse } from "next/server";
import {
  fetchCustomBanners,
  removeCustomBanner,
  saveCustomBanner,
} from "@/lib/banner-store";
import { parseImageDimensions } from "@/lib/image-dimensions";
import {
  ALLOWED_BANNER_EXTENSIONS,
  MAX_BANNER_FILE_SIZE,
} from "@/lib/banners";

export const dynamic = "force-dynamic";

export async function GET() {
  const slides = await fetchCustomBanners();
  return NextResponse.json({ slides });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const rawId = formData.get("id");
  const rawHref = formData.get("href");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No banner file provided." },
      { status: 400 },
    );
  }
  if (typeof rawId !== "string" || rawId.length === 0) {
    return NextResponse.json(
      { error: "Missing banner id." },
      { status: 400 },
    );
  }
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : "";
  if (!ALLOWED_BANNER_EXTENSIONS.includes(extension as never)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPG, WebP, GIF or SVG." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BANNER_FILE_SIZE) {
    return NextResponse.json(
      { error: "Banner file must be 5 MB or smaller." },
      { status: 400 },
    );
  }
  const href =
    typeof rawHref === "string" && rawHref.trim().length > 0
      ? rawHref.trim()
      : null;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { width, height } = parseImageDimensions(bytes, extension);
    const slides = await saveCustomBanner({
      file,
      id: rawId,
      href,
      width,
      height,
    });
    return NextResponse.json({ slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the banner.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
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