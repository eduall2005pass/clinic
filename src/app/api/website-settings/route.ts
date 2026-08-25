import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  getWebsiteSettingsWithFallback,
  saveWebsiteSettings,
  removeFavicon,
} from "@/lib/website-settings";
import {
  ALLOWED_FAVICON_EXTENSIONS,
  MAX_FAVICON_FILE_SIZE,
} from "@/lib/website-settings-constants";
import { saveActiveLogo } from "@/lib/logo-store";
import { parseImageDimensions } from "@/lib/image-dimensions";
import {
  ALLOWED_LOGO_EXTENSIONS,
  MAX_LOGO_FILE_SIZE,
} from "@/lib/logo";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;


function parseOtherLinks(
  raw: string,
): Array<{ label?: unknown; href?: unknown }> | null | undefined {
  try {
    const parsed = raw === "" ? null : JSON.parse(raw);
    if (parsed === null) return null;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const settings = await getWebsiteSettingsWithFallback();
  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let siteName: string | undefined;
  let tagline: string | undefined;
  let contactEmail: string | undefined;
  let contactPhone: string | undefined;
  let facebookUrl: string | undefined;
  let youtubeUrl: string | undefined;
  let faviconFile: File | null = null;
  let logoFile: File | null = null;
  let address: string | undefined;
  let otherContactLinksJson: string | undefined;
  let copyrightText: string | undefined;
  let footerLinksJson: string | undefined;
  let showExplore: boolean | undefined;
  let showPrograms: boolean | undefined;
  let showContact: boolean | undefined;

  function asOptionalBool(value: FormDataEntryValue | string | null): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    siteName = asString(formData.get("site_name") ?? formData.get("siteName"));
    tagline = asString(formData.get("tagline"));
    contactEmail = asString(formData.get("contact_email") ?? formData.get("contactEmail"));
    contactPhone = asString(formData.get("contact_phone") ?? formData.get("contactPhone"));
    facebookUrl = asString(formData.get("facebook_url") ?? formData.get("facebookUrl"));
    youtubeUrl = asString(formData.get("youtube_url") ?? formData.get("youtubeUrl"));
    const rawFavicon = formData.get("favicon");
    if (rawFavicon instanceof File && rawFavicon.size > 0) faviconFile = rawFavicon;
    const rawLogo = formData.get("logo");
    if (rawLogo instanceof File && rawLogo.size > 0) logoFile = rawLogo;
    address = asString(formData.get("address"));
    const rawOtherLinks = formData.get("other_contact_links");
    if (typeof rawOtherLinks === "string") otherContactLinksJson = rawOtherLinks;
    copyrightText = asString(formData.get("copyright_text"));
    footerLinksJson = asString(formData.get("footer_links"));
    showExplore = asOptionalBool(formData.get("show_explore"));
    showPrograms = asOptionalBool(formData.get("show_programs"));
    showContact = asOptionalBool(formData.get("show_contact"));
  } else {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    siteName = asString(body.site_name ?? body.siteName);
    tagline = asString(body.tagline);
    contactEmail = asString(body.contact_email ?? body.contactEmail);
    contactPhone = asString(body.contact_phone ?? body.contactPhone);
    facebookUrl = asString(body.facebook_url ?? body.facebookUrl);
    youtubeUrl = asString(body.youtube_url ?? body.youtubeUrl);
    address = asString(body.address);
    if (typeof body.other_contact_links === "string") {
      otherContactLinksJson = body.other_contact_links;
    } else if (Array.isArray(body.otherContactLinks)) {
      otherContactLinksJson = JSON.stringify(body.otherContactLinks);
    }
    copyrightText = asString(body.copyright_text ?? body.copyrightText);
    const rawLinks =
      typeof body.footer_links === "string"
        ? body.footer_links
        : Array.isArray(body.footerLinks)
          ? JSON.stringify(body.footerLinks)
          : undefined;
    footerLinksJson = rawLinks;
    showExplore = asOptionalBool(
      typeof body.show_explore === "boolean"
        ? String(body.show_explore)
        : (body.show_explore as string | null) ?? null,
    );
    showPrograms = asOptionalBool(
      typeof body.show_programs === "boolean"
        ? String(body.show_programs)
        : (body.show_programs as string | null) ?? null,
    );
    showContact = asOptionalBool(
      typeof body.show_contact === "boolean"
        ? String(body.show_contact)
        : (body.show_contact as string | null) ?? null,
    );
  }

  // Handle logo upload through the existing central logo pipeline so LogoProvider refreshes everywhere.
  let logoResult: { url: string; fileName: string } | null = null;
  if (logoFile) {
    const extension = logoFile.name.includes(".")
      ? `.${logoFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!(ALLOWED_LOGO_EXTENSIONS as readonly string[]).includes(extension)) {
      return NextResponse.json(
        { error: "Unsupported logo file type. Use PNG, JPG, WebP, GIF or SVG." },
        { status: 400 },
      );
    }
    if (logoFile.size > MAX_LOGO_FILE_SIZE) {
      return NextResponse.json(
        { error: "Logo file must be 5 MB or smaller." },
        { status: 400 },
      );
    }
    try {
      const bytes = new Uint8Array(await logoFile.arrayBuffer());
      const { width, height } = parseImageDimensions(bytes, extension);
      // Need to re-read file after arrayBuffer consumption — clone for saveActiveLogo.
      // Reconstruct File since arrayBuffer consumed the original's buffer cursor.
      const freshLogo = new File([bytes], logoFile.name, { type: logoFile.type });
      const saved = await saveActiveLogo(freshLogo, width, height, admin.uid);
      logoResult = { url: saved.url, fileName: saved.fileName };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save the logo.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Pre-validate favicon before touching DB to surface errors early.
  if (faviconFile) {
    const extension = faviconFile.name.includes(".")
      ? `.${faviconFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!(ALLOWED_FAVICON_EXTENSIONS as readonly string[]).includes(extension)) {
      return NextResponse.json(
        { error: "Unsupported favicon file type. Use ICO, PNG, JPG, WebP, GIF or SVG." },
        { status: 400 },
      );
    }
    if (faviconFile.size > MAX_FAVICON_FILE_SIZE) {
      return NextResponse.json(
        { error: "Favicon file must be 5 MB or smaller." },
        { status: 400 },
      );
    }
  }

  try {
    let parsedFooterLinks: Array<{ label?: unknown; href?: unknown }> | null | undefined;
    if (footerLinksJson !== undefined) {
      try {
        const parsed = footerLinksJson === null ? null : JSON.parse(footerLinksJson);
        parsedFooterLinks = parsed === null ? null : Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return NextResponse.json(
          { error: "footer_links must be valid JSON." },
          { status: 400 },
        );
      }
    }

    const settings = await saveWebsiteSettings(
      {
        siteName: siteName ?? undefined,
        tagline: tagline ?? undefined,
        contactEmail: contactEmail ?? undefined,
        contactPhone: contactPhone ?? undefined,
        address: address !== undefined ? address : undefined,
        facebookUrl: facebookUrl ?? undefined,
        youtubeUrl: youtubeUrl ?? undefined,
        copyrightText: copyrightText !== undefined ? copyrightText : undefined,
        footerLinks: parsedFooterLinks === undefined ? undefined : parsedFooterLinks,
        otherContactLinks:
          otherContactLinksJson === undefined
            ? undefined
            : parseOtherLinks(otherContactLinksJson),
        showExplore,
        showPrograms,
        showContact,
      },
      faviconFile,
      admin.uid,
    );
    return NextResponse.json({
      message: "Website settings updated successfully.",
      settings,
      logo: logoResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save website settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const target = url.searchParams.get("target") ?? (await request.json().catch(() => null))?.target;
  if (target === "favicon") {
    try {
      const settings = await removeFavicon(admin.uid);
      return NextResponse.json({
        message: "Favicon removed.",
        settings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove favicon.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Unknown target." }, { status: 400 });
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}
