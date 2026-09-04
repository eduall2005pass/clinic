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
import { makeTransparentPng } from "@/lib/logo-background";

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
    const rawBytes = new Uint8Array(await file.arrayBuffer());

    // Auto background removal: ANY uploaded logo (JPG/PNG/WEBP/etc.) is converted to transparent PNG
    // SVG is preserved as-is (already vector with transparency)
    let processedBytes: Buffer;
    let processedFileName: string;
    let processedMime: string;
    let width = 512;
    let height = 512;

    if (extension === ".svg") {
      // SVG: keep original, dimensions from SVG parser, preserve as SVG
      processedBytes = Buffer.from(rawBytes);
      processedFileName = file.name;
      processedMime = "image/svg+xml";
      try {
        const dims = parseImageDimensions(rawBytes, extension);
        width = dims.width;
        height = dims.height;
      } catch (dimErr) {
        console.warn("SVG dimensions parse failed, using fallback:", dimErr);
      }
    } else {
      // Raster: remove background, output transparent PNG (preserves alpha, no JPG flattening)
      try {
        processedBytes = await makeTransparentPng(rawBytes);
      } catch (bgErr) {
        console.warn("Background removal failed, using original with ensure-alpha:", bgErr);
        // Fallback: ensure original is encoded as PNG with alpha (no background added)
        try {
          const sharp = (await import("sharp")).default;
          processedBytes = await sharp(rawBytes).ensureAlpha().png({ palette: false }).toBuffer();
        } catch {
          processedBytes = Buffer.from(rawBytes);
        }
      }
      // Dimensions from processed PNG (after potential resize)
      try {
        const dims = parseImageDimensions(new Uint8Array(processedBytes), ".png");
        width = dims.width;
        height = dims.height;
      } catch (dimErr) {
        console.warn("Processed PNG dimensions parse failed, using fallback:", dimErr);
        try {
          const dims = parseImageDimensions(rawBytes, extension);
          width = dims.width;
          height = dims.height;
        } catch {
          // keep fallback 512
        }
      }
      // Force PNG output regardless of input (JPG/WEBP→PNG) to preserve transparency
      const base = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
      processedFileName = `${base}.png`;
      processedMime = "image/png";
    }

    const freshFile = new File([new Uint8Array(processedBytes)], processedFileName, { type: processedMime });
    const logo = await saveActiveLogo(freshFile, width, height, admin.uid, mode);
    // Bust CDN/edge cache immediately so new logo appears everywhere (persistent URL, survives refresh/logout)
    try {
      (revalidateTag as unknown as (tag: string, profile: string) => void)("logo", "max");
      (revalidateTag as unknown as (tag: string, profile: string) => void)("logo-theme", "max");
      (revalidateTag as unknown as (tag: string, profile: string) => void)("layout-logo", "max");
      (revalidateTag as unknown as (tag: string, profile: string) => void)("layout-themelogos", "max");
      revalidatePath("/", "layout");
      revalidatePath("/admin/website/logo-favicon");
      revalidatePath("/admin/website-information");
    } catch {
      // revalidation is best-effort (may not be available in some runtimes)
    }
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
