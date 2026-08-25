import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchThemeSettings,
  normalizeThemeSettingsInput,
  saveThemeSettings,
} from "@/lib/theme-settings";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  const theme = await fetchThemeSettings();
  return NextResponse.json({ theme }, { headers: CACHE_HEADERS });
}

export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
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
    return NextResponse.json({ theme }, { headers: CACHE_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save theme settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
