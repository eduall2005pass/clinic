import { query, parseDate } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";
import { fetchAdminAccount } from "@/lib/admin";
import {
  DEFAULT_WEBSITE_SETTINGS,
  WEBSITE_SETTINGS_ID,
  FAVICON_STORAGE_DIR,
  MAX_FAVICON_FILE_SIZE,
  ALLOWED_FAVICON_EXTENSIONS,
  type WebsiteSettings,
  type FooterLink,
} from "@/lib/website-settings-constants";

type WebsiteSettingsRow = {
  site_name: string | null;
  tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  favicon_url: string | null;
  favicon_file_name: string | null;
  favicon_updated_at: Date | string | null;
  updated_at: Date | string | null;
  updated_by: string | null;
  copyright_text?: string | null;
  footer_links?: string | null;
  show_explore?: number | boolean | null;
  show_programs?: number | boolean | null;
  show_contact?: number | boolean | null;
};

function mapRow(row: WebsiteSettingsRow, adminDisplayName: string | null): WebsiteSettings {
  const faviconUpdatedAt = row.favicon_updated_at
    ? Date.parse(parseDate(row.favicon_updated_at)) || null
    : null;
  const updatedAt = row.updated_at
    ? Date.parse(parseDate(row.updated_at)) || null
    : null;
  return {
    siteName: row.site_name ?? DEFAULT_WEBSITE_SETTINGS.siteName,
    tagline: row.tagline ?? DEFAULT_WEBSITE_SETTINGS.tagline,
    contactEmail: row.contact_email ?? DEFAULT_WEBSITE_SETTINGS.contactEmail,
    contactPhone: row.contact_phone ?? "",
    facebookUrl: row.facebook_url ?? "",
    youtubeUrl: row.youtube_url ?? "",
    faviconUrl: row.favicon_url ?? null,
    faviconFileName: row.favicon_file_name ?? null,
    faviconUpdatedAt,
    updatedAt,
    updatedBy: adminDisplayName ?? row.updated_by ?? null,
    copyrightText:
      typeof row.copyright_text === "string" && row.copyright_text.trim().length > 0
        ? row.copyright_text
        : null,
    footerLinks: parseFooterLinks(row.footer_links),
    showExplore: row.show_explore === undefined || row.show_explore === null ? true : Boolean(row.show_explore),
    showPrograms: row.show_programs === undefined || row.show_programs === null ? true : Boolean(row.show_programs),
    showContact: row.show_contact === undefined || row.show_contact === null ? true : Boolean(row.show_contact),
  };
}

function parseFooterLinks(raw: string | null | undefined): FooterLink[] | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const links = parsed
      .map((item) => ({
        label: typeof item?.label === "string" ? item.label.trim() : "",
        href: typeof item?.href === "string" ? item.href.trim() : "",
      }))
      .filter((item) => item.label.length > 0 && item.href.length > 0)
      .slice(0, 20);
    return links.length > 0 ? links : null;
  } catch {
    return null;
  }
}

const FOOTER_COLUMNS = `, copyright_text, footer_links, show_explore, show_programs, show_contact`;

export async function fetchWebsiteSettings(): Promise<WebsiteSettings | null> {
  try {
    let rows: WebsiteSettingsRow[];
    try {
      rows = await query<WebsiteSettingsRow[]>(
        `SELECT site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url,
                favicon_url, favicon_file_name, favicon_updated_at, updated_at, updated_by${FOOTER_COLUMNS}
         FROM website_settings WHERE id = ? LIMIT 1`,
        [WEBSITE_SETTINGS_ID],
      );
    } catch {
      // Footer columns may not exist on older databases — retry without them.
      rows = await query<WebsiteSettingsRow[]>(
        `SELECT site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url,
                favicon_url, favicon_file_name, favicon_updated_at, updated_at, updated_by
         FROM website_settings WHERE id = ? LIMIT 1`,
        [WEBSITE_SETTINGS_ID],
      );
    }
    const row = rows[0];
    if (!row) return null;
    const account = row.updated_by
      ? await fetchAdminAccount(row.updated_by)
      : null;
    const displayName =
      account?.displayName ?? account?.email ?? row.updated_by ?? null;
    return mapRow(row, displayName);
  } catch {
    return null;
  }
}

export async function getWebsiteSettingsWithFallback(): Promise<WebsiteSettings> {
  const settings = await fetchWebsiteSettings();
  return settings ?? DEFAULT_WEBSITE_SETTINGS;
}

export type FooterLinkInput = { label?: unknown; href?: unknown };

type SaveInput = {
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  copyrightText?: string | null;
  footerLinks?: FooterLinkInput[] | null;
  showExplore?: boolean;
  showPrograms?: boolean;
  showContact?: boolean;
};

function isValidFooterHref(href: string): boolean {
  return (
    href.startsWith("/") ||
    href.startsWith("https://") ||
    href.startsWith("http://") ||
    href.startsWith("#") ||
    href.startsWith("mailto:")
  );
}

export async function saveWebsiteSettings(
  input: SaveInput,
  faviconFile: File | null,
  adminUid: string,
): Promise<WebsiteSettings> {
  // Fetch existing to preserve unchanged fields and to clean up old favicon.
  let existingRow: WebsiteSettingsRow | null = null;
  try {
    const rows = await query<WebsiteSettingsRow[]>(
      `SELECT site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url,
              favicon_url, favicon_file_name, favicon_updated_at, updated_at, updated_by,
              favicon_storage_path
       FROM website_settings WHERE id = ? LIMIT 1`,
      [WEBSITE_SETTINGS_ID],
    );
    existingRow = (rows[0] as WebsiteSettingsRow & { favicon_storage_path?: string | null }) ?? null;
  } catch {
    existingRow = null;
  }

  const siteName = input.siteName?.trim() || existingRow?.site_name || DEFAULT_WEBSITE_SETTINGS.siteName;
  const tagline = input.tagline !== undefined ? input.tagline.trim() : (existingRow?.tagline ?? DEFAULT_WEBSITE_SETTINGS.tagline);
  const contactEmail = input.contactEmail !== undefined ? input.contactEmail.trim() : (existingRow?.contact_email ?? DEFAULT_WEBSITE_SETTINGS.contactEmail);
  const contactPhone = input.contactPhone !== undefined ? input.contactPhone.trim() : (existingRow?.contact_phone ?? "");
  const facebookUrl = input.facebookUrl !== undefined ? input.facebookUrl.trim() : (existingRow?.facebook_url ?? "");
  const youtubeUrl = input.youtubeUrl !== undefined ? input.youtubeUrl.trim() : (existingRow?.youtube_url ?? "");

  // Footer-specific values
  const copyrightText =
    input.copyrightText !== undefined
      ? input.copyrightText && input.copyrightText.trim().length > 0
        ? input.copyrightText.trim().slice(0, 255)
        : null
      : typeof existingRow?.copyright_text === "string" &&
          existingRow.copyright_text.trim().length > 0
        ? existingRow.copyright_text
        : null;

  let footerLinksJson: string | null = null;
  if (input.footerLinks !== undefined) {
    if (input.footerLinks === null) {
      footerLinksJson = null;
    } else {
      const links: FooterLink[] = [];
      for (const raw of input.footerLinks) {
        const label = typeof raw?.label === "string" ? raw.label.trim() : "";
        const href = typeof raw?.href === "string" ? raw.href.trim() : "";
        if (!label || !href) {
          throw new Error("Each footer link needs a label and a link.");
        }
        if (label.length > 100) {
          throw new Error("Footer link labels must be under 100 characters.");
        }
        if (!isValidFooterHref(href)) {
          throw new Error(
            "Footer links must be an internal path (/courses) or a full URL.",
          );
        }
        links.push({ label, href: href.slice(0, 500) });
      }
      footerLinksJson = links.length > 0 ? JSON.stringify(links) : null;
    }
  } else if (typeof existingRow?.footer_links === "string") {
    footerLinksJson = existingRow.footer_links;
  }

  const showExplore =
    input.showExplore !== undefined
      ? input.showExplore
      : existingRow?.show_explore === undefined ||
          existingRow?.show_explore === null
        ? true
        : Boolean(existingRow.show_explore);
  const showPrograms =
    input.showPrograms !== undefined
      ? input.showPrograms
      : existingRow?.show_programs === undefined ||
          existingRow?.show_programs === null
        ? true
        : Boolean(existingRow.show_programs);
  const showContact =
    input.showContact !== undefined
      ? input.showContact
      : existingRow?.show_contact === undefined ||
          existingRow?.show_contact === null
        ? true
        : Boolean(existingRow.show_contact);

  // Validation
  if (siteName.length === 0 || siteName.length > 255) {
    throw new Error("Website name is required and must be under 255 characters.");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("Contact email is not a valid email address.");
  }
  if (facebookUrl && !isValidHttpUrl(facebookUrl)) {
    throw new Error("Facebook link must be a valid URL (https://...).");
  }
  if (youtubeUrl && !isValidHttpUrl(youtubeUrl)) {
    throw new Error("YouTube link must be a valid URL (https://...).");
  }

  let faviconUrl: string | null = (existingRow?.favicon_url as string | null) ?? null;
  let faviconStoragePath: string | null = (existingRow as unknown as { favicon_storage_path?: string | null })?.favicon_storage_path ?? null;
  let faviconFileName: string | null = existingRow?.favicon_file_name ?? null;
  let previousFaviconPath: string | null = null;

  if (faviconFile) {
    const extension = faviconFile.name.includes(".")
      ? `.${faviconFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!(ALLOWED_FAVICON_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new Error("Unsupported favicon file type. Use ICO, PNG, JPG, WebP, GIF or SVG.");
    }
    if (faviconFile.size > MAX_FAVICON_FILE_SIZE) {
      throw new Error("Favicon file must be 5 MB or smaller.");
    }
    const fileName = `favicon-${Date.now()}${extension}`;
    const url = await saveFile(
      FAVICON_STORAGE_DIR,
      fileName,
      await faviconFile.arrayBuffer(),
    );
    const newStoragePath = `${FAVICON_STORAGE_DIR}/${fileName}`;
    // Keep previous for cleanup after successful DB write.
    if (typeof faviconStoragePath === "string" && isLocalUpload(faviconStoragePath)) {
      previousFaviconPath = faviconStoragePath;
    } else if (typeof faviconUrl === "string" && isLocalUpload(faviconUrl)) {
      previousFaviconPath = faviconUrl;
    }
    faviconUrl = url;
    faviconStoragePath = newStoragePath;
    faviconFileName = faviconFile.name;
  }

  // Upsert website_settings. favicon_storage_path column may not exist on older DBs — try with it and fallback.
  const nowAccount = await fetchAdminAccount(adminUid);
  const displayName = nowAccount?.displayName ?? nowAccount?.email ?? adminUid;

  try {
    await query(
      `INSERT INTO website_settings
        (id, site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url,
         favicon_url, favicon_storage_path, favicon_file_name, favicon_updated_at, updated_at, updated_by, created_at,
         copyright_text, footer_links, show_explore, show_programs, show_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, NOW(), ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         site_name = VALUES(site_name),
         tagline = VALUES(tagline),
         contact_email = VALUES(contact_email),
         contact_phone = VALUES(contact_phone),
         facebook_url = VALUES(facebook_url),
         youtube_url = VALUES(youtube_url),
         favicon_url = VALUES(favicon_url),
         favicon_storage_path = VALUES(favicon_storage_path),
         favicon_file_name = VALUES(favicon_file_name),
         favicon_updated_at = VALUES(favicon_updated_at),
         updated_by = VALUES(updated_by),
         copyright_text = VALUES(copyright_text),
         footer_links = VALUES(footer_links),
         show_explore = VALUES(show_explore),
         show_programs = VALUES(show_programs),
         show_contact = VALUES(show_contact)`,
      [
        WEBSITE_SETTINGS_ID,
        siteName,
        tagline || null,
        contactEmail || null,
        contactPhone || null,
        facebookUrl || null,
        youtubeUrl || null,
        faviconUrl,
        faviconStoragePath,
        faviconFileName,
        adminUid,
        copyrightText,
        footerLinksJson,
        showExplore ? 1 : 0,
        showPrograms ? 1 : 0,
        showContact ? 1 : 0,
      ],
    );
  } catch (error) {
    // If favicon_storage_path column does not exist, retry without it.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("favicon_storage_path") || message.includes("Unknown column")) {
      await query(
        `INSERT INTO website_settings
          (id, site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url,
           favicon_url, favicon_file_name, favicon_updated_at, updated_at, updated_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, NOW())
         ON DUPLICATE KEY UPDATE
           site_name = VALUES(site_name),
           tagline = VALUES(tagline),
           contact_email = VALUES(contact_email),
           contact_phone = VALUES(contact_phone),
           facebook_url = VALUES(facebook_url),
           youtube_url = VALUES(youtube_url),
           favicon_url = VALUES(favicon_url),
           favicon_file_name = VALUES(favicon_file_name),
           favicon_updated_at = VALUES(favicon_updated_at),
           updated_by = VALUES(updated_by)`,
        [
          WEBSITE_SETTINGS_ID,
          siteName,
          tagline || null,
          contactEmail || null,
          contactPhone || null,
          facebookUrl || null,
          youtubeUrl || null,
          faviconUrl,
          faviconFileName,
          adminUid,
        ],
      );
    } else {
      throw error;
    }
  }

  if (previousFaviconPath) {
    await removeFile(previousFaviconPath);
  }

  return {
    siteName,
    tagline: tagline || "",
    contactEmail: contactEmail || "",
    contactPhone: contactPhone || "",
    facebookUrl: facebookUrl || "",
    youtubeUrl: youtubeUrl || "",
    faviconUrl,
    faviconFileName,
    faviconUpdatedAt: faviconFile ? Date.now() : (existingRow?.favicon_updated_at ? Date.parse(parseDate(existingRow.favicon_updated_at)) || Date.now() : null),
    updatedAt: Date.now(),
    updatedBy: displayName,
    copyrightText,
    footerLinks:
      footerLinksJson !== undefined
        ? parseFooterLinks(footerLinksJson)
        : parseFooterLinks(typeof existingRow?.footer_links === "string" ? existingRow.footer_links : null),
    showExplore,
    showPrograms,
    showContact,
  };
}

export async function removeFavicon(adminUid: string): Promise<WebsiteSettings> {
  let existingRow: (WebsiteSettingsRow & { favicon_storage_path?: string | null }) | null = null;
  try {
    const rows = await query<(WebsiteSettingsRow & { favicon_storage_path?: string | null })[]>(
      `SELECT site_name, tagline, contact_email, contact_phone, facebook_url, youtube_url,
              favicon_url, favicon_file_name, favicon_updated_at, updated_at, updated_by, favicon_storage_path
       FROM website_settings WHERE id = ? LIMIT 1`,
      [WEBSITE_SETTINGS_ID],
    );
    existingRow = rows[0] ?? null;
  } catch {
    existingRow = null;
  }

  const storagePath = existingRow?.favicon_storage_path ?? existingRow?.favicon_url ?? null;
  try {
    await query(
      `UPDATE website_settings
       SET favicon_url = NULL, favicon_storage_path = NULL, favicon_file_name = NULL, favicon_updated_at = NULL, updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [adminUid, WEBSITE_SETTINGS_ID],
    );
  } catch {
    await query(
      `UPDATE website_settings
       SET favicon_url = NULL, favicon_file_name = NULL, favicon_updated_at = NULL, updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [adminUid, WEBSITE_SETTINGS_ID],
    );
  }
  if (typeof storagePath === "string" && isLocalUpload(storagePath)) {
    await removeFile(storagePath);
  }
  const account = await fetchAdminAccount(adminUid);
  const displayName = account?.displayName ?? account?.email ?? adminUid;
  return {
    siteName: existingRow?.site_name ?? DEFAULT_WEBSITE_SETTINGS.siteName,
    tagline: existingRow?.tagline ?? DEFAULT_WEBSITE_SETTINGS.tagline,
    contactEmail: existingRow?.contact_email ?? DEFAULT_WEBSITE_SETTINGS.contactEmail,
    contactPhone: existingRow?.contact_phone ?? "",
    facebookUrl: existingRow?.facebook_url ?? "",
    youtubeUrl: existingRow?.youtube_url ?? "",
    faviconUrl: null,
    faviconFileName: null,
    faviconUpdatedAt: null,
    updatedAt: Date.now(),
    updatedBy: displayName,
    copyrightText:
      typeof existingRow?.copyright_text === "string" &&
      existingRow.copyright_text.trim().length > 0
        ? existingRow.copyright_text
        : null,
    footerLinks: parseFooterLinks(
      typeof existingRow?.footer_links === "string" ? existingRow.footer_links : null,
    ),
    showExplore:
      existingRow?.show_explore === undefined || existingRow?.show_explore === null
        ? true
        : Boolean(existingRow.show_explore),
    showPrograms:
      existingRow?.show_programs === undefined || existingRow?.show_programs === null
        ? true
        : Boolean(existingRow.show_programs),
    showContact:
      existingRow?.show_contact === undefined || existingRow?.show_contact === null
        ? true
        : Boolean(existingRow.show_contact),
  };
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
