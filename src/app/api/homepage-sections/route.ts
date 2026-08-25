import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchHomepageSections, saveHomepageSections } from "@/lib/homepage-sections";
import {
  isValidHomepageSectionKey,
  type HomepageSection,
  type HomepageSectionKey,
} from "@/lib/homepage-sections-constants";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

export async function GET() {
  const sections = await fetchHomepageSections();
  return NextResponse.json({ sections });
}

export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sections?: unknown;
  } | null;

  if (!body || !Array.isArray(body.sections)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sections: HomepageSection[] = [];
  for (const raw of body.sections) {
    const entry = raw as Record<string, unknown>;
    const key = typeof entry.key === "string" ? entry.key : null;
    if (!key || !isValidHomepageSectionKey(key)) {
      return NextResponse.json(
        { error: "Unknown homepage section key." },
        { status: 400 },
      );
    }
    sections.push({
      key: key as HomepageSectionKey,
      label: "",
      title:
        typeof entry.title === "string" && entry.title.trim().length > 0
          ? entry.title
          : null,
      description:
        typeof entry.description === "string" && entry.description.trim().length > 0
          ? entry.description
          : null,
      isActive: entry.isActive === true || entry.isActive === "true" || entry.isActive === "1",
    });
  }

  try {
    const saved = await saveHomepageSections(sections, admin.uid);
    return NextResponse.json({
      message: "Homepage settings saved successfully.",
      sections: saved,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save homepage settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
