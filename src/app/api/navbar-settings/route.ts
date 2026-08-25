import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchNavbarConfig, saveNavbarConfig } from "@/lib/navbar";
import { DEFAULT_NAVBAR_ITEMS, type NavbarItem } from "@/lib/navbar-constants";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

export async function GET() {
  const config = await fetchNavbarConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    showNavbar?: unknown;
    showMoreMenu?: unknown;
    showThemeToggle?: unknown;
    showLoginButton?: unknown;
    items?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  function asBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return undefined;
  }

  let items: NavbarItem[] | undefined;
  if (Array.isArray(body.items)) {
    items = [];
    for (const raw of body.items) {
      const entry = raw as Record<string, unknown>;
      const key = typeof entry.key === "string" ? entry.key : null;
      const label = typeof entry.label === "string" ? entry.label : null;
      const href =
        typeof entry.href === "string" && entry.href.trim().length > 0
          ? entry.href
          : null;
      const isActive =
        typeof entry.isActive === "boolean" ? entry.isActive : undefined;

      // Only allow the fixed set of existing navigation keys.
      if (!key || !DEFAULT_NAVBAR_ITEMS.some((item) => item.key === key)) {
        return NextResponse.json(
          { error: "Unknown navigation item key." },
          { status: 400 },
        );
      }
      if (label === null) {
        return NextResponse.json(
          { error: "Navigation name is required." },
          { status: 400 },
        );
      }
      items.push({
        key,
        label,
        href,
        isActive: isActive ?? true,
      });
    }
  }

  try {
    const config = await saveNavbarConfig(
      {
        showNavbar: asBoolean(body.showNavbar),
        showMoreMenu: asBoolean(body.showMoreMenu),
        showThemeToggle: asBoolean(body.showThemeToggle),
        showLoginButton: asBoolean(body.showLoginButton),
        items,
      },
      admin.uid,
    );
    return NextResponse.json({ message: "Header settings saved successfully.", config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save header settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
