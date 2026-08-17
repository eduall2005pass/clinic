import { NextRequest, NextResponse } from "next/server";
import {
  fetchActiveLogo,
  removeActiveLogo,
  saveActiveLogo,
} from "@/lib/logo-firebase";
import { parseImageDimensions } from "@/lib/image-dimensions";
import { ALLOWED_LOGO_EXTENSIONS, MAX_LOGO_FILE_SIZE } from "@/lib/logo";

export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await fetchActiveLogo();
  return NextResponse.json({ logo });
}

export async function POST(request: NextRequest) {
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
    const logo = await saveActiveLogo(file, width, height);
    return NextResponse.json({ logo });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the logo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  await removeActiveLogo();
  return NextResponse.json({ ok: true });
}