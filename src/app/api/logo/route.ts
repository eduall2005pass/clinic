import { NextRequest, NextResponse } from "next/server";
import {
  fetchActiveLogo,
  fetchThemeLogos,
  removeActiveLogo,
  saveActiveLogo,
  type LogoMode,
} from "@/lib/logo-store";
import { parseImageDimensions } from "@/lib/image-dimensions";
import { ALLOWED_LOGO_EXTENSIONS, MAX_LOGO_FILE_SIZE } from "@/lib/logo";
import { requirePermission } from "@/lib/admin";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function parseMode(value: string | null): LogoMode | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

/** GET — shared logo + BOTH theme logos so the client can switch instantly. */
export async function GET() {
  const [logo, themes] = await Promise.all([
    fetchActiveLogo(),
    fetchThemeLogos(),
  ]);
  return NextResponse.json(
    { logo, light: themes.light, dark: themes.dark },
    { headers: NO_CACHE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const formData = await request.formData();
  // mode=light / mode=dark targets the theme-specific slot; no mode updates
  // the shared fallback logo.
  const mode = parseMode(formData.get("mode") as string | null);
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
    const logo = await saveActiveLogo(freshFile, width, height, admin.uid, mode);
    return NextResponse.json({ logo }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the logo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));
  try {
    await removeActiveLogo(mode);
    return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not restore the default logo." },
      { status: 500 },
    );
  }
}
