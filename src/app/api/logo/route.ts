import { NextRequest, NextResponse } from "next/server";
import {
  getActiveLogo,
  removeActiveLogo,
  saveActiveLogo,
} from "@/lib/logo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await getActiveLogo();
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
  try {
    const logo = await saveActiveLogo(file);
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