import { NextRequest, NextResponse } from "next/server";
import {
  fetchActiveLogo,
  removeActiveLogo,
  saveActiveLogo,
} from "@/lib/logo-store";
import { parseImageDimensions } from "@/lib/image-dimensions";
import { ALLOWED_LOGO_EXTENSIONS, MAX_LOGO_FILE_SIZE } from "@/lib/logo";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const logo = await fetchActiveLogo();
  return NextResponse.json({ logo }, { headers: NO_CACHE_HEADERS });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No logo file provided." },
      { status: 400 },
    );
  }
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : "";
  if (!ALLOWED_LOGO_EXTENSIONS.includes(extension as never)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPG, WebP, GIF or SVG." },
      { status: 400 },
    );
  }
  if (file.size > MAX_LOGO_FILE_SIZE) {
    return NextResponse.json(
      { error: "Logo file must be 5 MB or smaller." },
      { status: 400 },
    );
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { width, height } = parseImageDimensions(bytes, extension);
    // Re-create File from bytes — original File's buffer was consumed by arrayBuffer()
    const freshFile = new File([bytes], file.name, { type: file.type });
    const logo = await saveActiveLogo(freshFile, width, height, admin.uid);
    return NextResponse.json({ logo }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the logo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    await removeActiveLogo();
    return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not restore the default logo." },
      { status: 500 },
    );
  }
}