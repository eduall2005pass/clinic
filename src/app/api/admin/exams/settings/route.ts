import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchExamSettings, saveExamSettings } from "@/lib/exams-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await fetchExamSettings();
  return NextResponse.json(
    { settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const settings = await saveExamSettings(body, admin.uid);
    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save exam settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
