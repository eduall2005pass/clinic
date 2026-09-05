import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/admin";
import { fetchQaAskCardSettings, saveQaAskCardSettings } from "@/lib/qa-ask-card-settings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageContent", "manageQa"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const settings = await fetchQaAskCardSettings();
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageContent", "manageQa"]);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : undefined;
  const placeholder = typeof body.placeholder === "string" ? body.placeholder.trim() : undefined;
  const submitLabel = typeof body.submitLabel === "string" ? body.submitLabel.trim() : undefined;
  const cancelLabel = typeof body.cancelLabel === "string" ? body.cancelLabel.trim() : undefined;
  const showImageUpload = typeof body.showImageUpload === "boolean" ? body.showImageUpload : undefined;
  const guidelineText = typeof body.guidelineText === "string" ? body.guidelineText.trim() : undefined;

  if (title !== undefined && (title.length < 2 || title.length > 255)) {
    return NextResponse.json({ error: "Title must be 2–255 characters." }, { status: 400 });
  }
  if (submitLabel !== undefined && (submitLabel.length < 2 || submitLabel.length > 255)) {
    return NextResponse.json({ error: "Submit label must be 2–255 characters." }, { status: 400 });
  }

  const saved = await saveQaAskCardSettings(
    { title, subtitle, placeholder, submitLabel, cancelLabel, showImageUpload, guidelineText },
    admin.uid ?? admin.email ?? "admin",
  );
  return NextResponse.json(saved);
}
