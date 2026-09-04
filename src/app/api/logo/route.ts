import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
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
export const revalidate = 300;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
    { headers: CACHE_HEADERS },
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
    let width = 512;
    let height = 512;
    try {
      const dims = parseImageDimensions(bytes, extension);
      width = dims.width;
      height = dims.height;
    } catch (dimErr) {
      // Non-fatal — use fallback dimensions so upload still succeeds (e.g., progressive JPEG/WebP variants or SVG without explicit size)
      console.warn("Logo dimensions parse failed, using fallback:", dimErr);
    }
    // Re-create File from bytes — original File's buffer was consumed by arrayBuffer()
    const freshFile = new File([bytes], file.name, { type: file.type });
    const logo = await saveActiveLogo(freshFile, width, height, admin.uid, mode);
    // Bust CDN/edge cache immediately so new logo appears everywhere
    return NextResponse.json({ logo }, { headers: { ...CACHE_HEADERS, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Logo save failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save the logo.";
    // Provide clearer error for common misconfigurations
    if (message.includes("MEDIA_UPLOAD_TOKEN")) {
      return NextResponse.json({ error: "Storage not configured (MEDIA_UPLOAD_TOKEN missing). Please set env var on Vercel and VM." }, { status: 500 });
    }
    if (message.includes("unauthorized") || message.includes("401")) {
      return NextResponse.json({ error: "Upload unauthorized — check MEDIA_UPLOAD_TOKEN." }, { status: 500 });
    }
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
    try {
      (revalidateTag as unknown as (tag: string, profile: string) => void)("logo", "max");
      (revalidateTag as unknown as (tag: string, profile: string) => void)("logo-theme", "max");
      (revalidateTag as unknown as (tag: string, profile: string) => void)("layout-logo", "max");
      (revalidateTag as unknown as (tag: string, profile: string) => void)("layout-themelogos", "max");
      revalidatePath("/", "layout");
      revalidatePath("/admin/website/logo-favicon");
      revalidatePath("/admin/website-information");
    } catch {
      // best-effort
    }
    return NextResponse.json({ ok: true }, { headers: { ...CACHE_HEADERS, "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Could not restore the default logo." },
      { status: 500 },
    );
  }
}
