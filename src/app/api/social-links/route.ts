import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchAllSocialLinks,
  saveSocialLinks,
  type SocialLinkUpdate,
} from "@/lib/social-links";
import { isSocialPlatformKey, type SocialPlatformKey } from "@/lib/social-links-constants";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 300;

export async function GET() {
  const links = await fetchAllSocialLinks();
  return NextResponse.json({ links });
}

export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    links?: unknown;
  } | null;

  if (!body || !Array.isArray(body.links)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: SocialLinkUpdate[] = [];
  for (const raw of body.links) {
    const entry = raw as Record<string, unknown>;
    const key = typeof entry.key === "string" ? entry.key : null;
    if (!key || !isSocialPlatformKey(key)) {
      return NextResponse.json(
        { error: "Unknown social platform." },
        { status: 400 },
      );
    }
    updates.push({
      key: key as SocialPlatformKey,
      url:
        typeof entry.url === "string" && entry.url.trim().length > 0
          ? entry.url.trim()
          : null,
      isActive: entry.isActive === true || entry.isActive === "true" || entry.isActive === "1",
    });
  }

  try {
    const links = await saveSocialLinks(updates, admin.uid);
    return NextResponse.json({
      message: "Social links saved successfully.",
      links,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save social links.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
