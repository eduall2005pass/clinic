import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  fetchThemeSettings,
  normalizeThemeSettingsInput,
  saveThemeSettings,
} from "@/lib/theme-settings";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

export async function GET() {
  const theme = await fetchThemeSettings();
  return NextResponse.json({ theme }, { headers: NO_CACHE_HEADERS });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const normalized = normalizeThemeSettingsInput(body);
    const theme = await saveThemeSettings(normalized, admin.uid);
    return NextResponse.json({ theme }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save theme settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
