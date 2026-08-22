import { query } from "@/lib/mysql";

export const SEO_SETTINGS_ID = "active";

export type SeoSettings = {
  /** Empty string = use the built-in default title. */
  siteTitle: string;
  metaDescription: string;
  keywords: string;
  /** Empty string = fall back to the site title / meta description. */
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
};

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteTitle: "",
  metaDescription: "",
  keywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
};

type SeoRow = {
  site_title: string;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
};

async function ensureSeoSettingsTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS seo_settings (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        site_title VARCHAR(255) NOT NULL DEFAULT '',
        meta_description TEXT NULL,
        keywords TEXT NULL,
        og_title VARCHAR(255) NOT NULL DEFAULT '',
        og_description TEXT NULL,
        og_image_url VARCHAR(500) NOT NULL DEFAULT '',
        updated_by VARCHAR(191) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await query(
      `INSERT IGNORE INTO seo_settings (id) VALUES (?)`,
      [SEO_SETTINGS_ID],
    );
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

function clean(value: string | null | undefined, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength);
}

function rowToSettings(row: SeoRow): SeoSettings {
  return {
    siteTitle: clean(row.site_title, 255),
    metaDescription: clean(row.meta_description, 2000),
    keywords: clean(row.keywords, 1000),
    ogTitle: clean(row.og_title, 255),
    ogDescription: clean(row.og_description, 2000),
    ogImageUrl: clean(row.og_image_url, 500),
  };
}

/** Current SEO settings — used by the root layout and the Admin Panel. */
export async function fetchSeoSettings(): Promise<SeoSettings> {
  try {
    await ensureSeoSettingsTable();
    const rows = await query<SeoRow[]>(
      `SELECT site_title, meta_description, keywords, og_title, og_description, og_image_url
       FROM seo_settings WHERE id = ? LIMIT 1`,
      [SEO_SETTINGS_ID],
    );
    if (!rows || rows.length === 0) return { ...DEFAULT_SEO_SETTINGS };
    return rowToSettings(rows[0]);
  } catch {
    // Table not migrated yet — fall back to defaults.
    return { ...DEFAULT_SEO_SETTINGS };
  }
}

export type SeoSettingsInput = Record<string, unknown>;

export function normalizeSeoSettingsInput(raw: SeoSettingsInput): SeoSettings {
  const pick = (key: string, maxLength: number): string => {
    const value = raw[key];
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
  };

  return {
    siteTitle: pick("siteTitle", 255),
    metaDescription: pick("metaDescription", 2000),
    keywords: pick("keywords", 1000),
    ogTitle: pick("ogTitle", 255),
    ogDescription: pick("ogDescription", 2000),
    ogImageUrl: pick("ogImageUrl", 500),
  };
}

export async function saveSeoSettings(
  input: SeoSettings,
  adminUid: string,
): Promise<SeoSettings> {
  await ensureSeoSettingsTable();
  await query(
    `UPDATE seo_settings SET
       site_title = ?,
       meta_description = ?,
       keywords = ?,
       og_title = ?,
       og_description = ?,
       og_image_url = ?,
       updated_by = ?
     WHERE id = ?`,
    [
      input.siteTitle,
      input.metaDescription,
      input.keywords,
      input.ogTitle,
      input.ogDescription,
      input.ogImageUrl,
      adminUid ?? null,
      SEO_SETTINGS_ID,
    ],
  );
  return fetchSeoSettings();
}
