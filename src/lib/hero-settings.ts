import { query } from "@/lib/mysql";
import { saveFile, removeFile } from "@/lib/storage";
import {
  DEFAULT_HERO_SETTINGS,
  MAX_HERO_IMAGE_FILE_SIZE,
  ALLOWED_HERO_IMAGE_EXTENSIONS,
  type HeroSettings,
} from "@/lib/hero-constants";

export const HERO_SETTINGS_ID = "active";
export const HERO_STORAGE_DIR = "website/hero";
export {
  MAX_HERO_IMAGE_FILE_SIZE,
  ALLOWED_HERO_IMAGE_EXTENSIONS,
  DEFAULT_HERO_SETTINGS,
};
export type { HeroSettings };

type HeroRow = {
  headline: string;
  description: string | null;
  button_text: string;
  button_link: string;
  is_active: number | boolean;
  background_url: string | null;
  background_storage_path: string | null;
  background_file_name: string | null;
  updated_at: Date | string;
  updated_by: string | null;
};

async function ensureHeroSettingsTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS hero_settings (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        headline VARCHAR(500) NOT NULL,
        description TEXT NULL,
        button_text VARCHAR(255) NOT NULL,
        button_link VARCHAR(1024) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        background_url VARCHAR(1024) NULL,
        background_storage_path VARCHAR(1024) NULL,
        background_file_name VARCHAR(255) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(191) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

function withCacheBust(url: string, updatedAt: number): string {
  if (!url || updatedAt <= 0) return url;
  if (url.includes("v=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${updatedAt}`;
}

function rowToSettings(row: HeroRow): HeroSettings {
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  return {
    headline: row.headline || DEFAULT_HERO_SETTINGS.headline,
    description: row.description ?? "",
    buttonText: row.button_text || DEFAULT_HERO_SETTINGS.buttonText,
    buttonLink: row.button_link || DEFAULT_HERO_SETTINGS.buttonLink,
    isActive: Boolean(row.is_active),
    backgroundImageUrl: row.background_url
      ? withCacheBust(row.background_url, updatedAt)
      : null,
    backgroundFileName: row.background_file_name ?? null,
    updatedAt: updatedAt || null,
    updatedBy: row.updated_by ?? null,
  };
}

export async function fetchHeroSettings(): Promise<HeroSettings> {
  try {
    await ensureHeroSettingsTable();
    const rows = await query<HeroRow[]>(
      `SELECT headline, description, button_text, button_link, is_active,
              background_url, background_storage_path, background_file_name,
              updated_at, updated_by
       FROM hero_settings WHERE id = ? LIMIT 1`,
      [HERO_SETTINGS_ID],
    );
    if (!rows || rows.length === 0) return DEFAULT_HERO_SETTINGS;
    return rowToSettings(rows[0]);
  } catch {
    return DEFAULT_HERO_SETTINGS;
  }
}

export type HeroSaveInput = {
  headline?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  isActive?: boolean;
  imageFile?: File | null;
  removeImage?: boolean;
};

export async function saveHeroSettings(
  input: HeroSaveInput,
  adminUid: string,
): Promise<HeroSettings> {
  await ensureHeroSettingsTable();

  const rows = await query<HeroRow[]>(
    `SELECT headline, description, button_text, button_link, is_active,
            background_url, background_storage_path, background_file_name,
            updated_at, updated_by
     FROM hero_settings WHERE id = ? LIMIT 1`,
    [HERO_SETTINGS_ID],
  );
  const existing = rows && rows.length > 0 ? rows[0] : null;

  let backgroundUrl = existing?.background_url ?? null;
  let backgroundStoragePath = existing?.background_storage_path ?? null;
  let backgroundFileName = existing?.background_file_name ?? null;

  // Replace background image when a new one is uploaded.
  if (input.imageFile) {
    const bytes = Buffer.from(
      new Uint8Array(await input.imageFile.arrayBuffer()),
    );
    const newUrl = await saveFile(HERO_STORAGE_DIR, input.imageFile.name, bytes);
    const oldStoragePath = backgroundStoragePath;
    backgroundUrl = newUrl;
    backgroundStoragePath = newUrl;
    backgroundFileName = input.imageFile.name;
    if (oldStoragePath && oldStoragePath !== newUrl) {
      await removeFile(oldStoragePath);
    }
  }

  // Remove background image entirely.
  if (input.removeImage) {
    const oldStoragePath = backgroundStoragePath;
    backgroundUrl = null;
    backgroundStoragePath = null;
    backgroundFileName = null;
    if (oldStoragePath) {
      await removeFile(oldStoragePath);
    }
  }

  const next = {
    headline:
      input.headline !== undefined
        ? input.headline.trim().slice(0, 500)
        : (existing?.headline ?? DEFAULT_HERO_SETTINGS.headline),
    description:
      input.description !== undefined
        ? input.description.trim()
        : (existing?.description ?? ""),
    buttonText:
      input.buttonText !== undefined
        ? input.buttonText.trim().slice(0, 255)
        : (existing?.button_text ?? DEFAULT_HERO_SETTINGS.buttonText),
    buttonLink:
      input.buttonLink !== undefined
        ? input.buttonLink.trim().slice(0, 1024)
        : (existing?.button_link ?? DEFAULT_HERO_SETTINGS.buttonLink),
    isActive: input.isActive !== undefined ? input.isActive : existing ? Boolean(existing.is_active) : true,
  };

  await query(
    `INSERT INTO hero_settings (
       id, headline, description, button_text, button_link, is_active,
       background_url, background_storage_path, background_file_name, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       headline = VALUES(headline),
       description = VALUES(description),
       button_text = VALUES(button_text),
       button_link = VALUES(button_link),
       is_active = VALUES(is_active),
       background_url = VALUES(background_url),
       background_storage_path = VALUES(background_storage_path),
       background_file_name = VALUES(background_file_name),
       updated_by = VALUES(updated_by)`,
    [
      HERO_SETTINGS_ID,
      next.headline,
      next.description || null,
      next.buttonText || DEFAULT_HERO_SETTINGS.buttonText,
      next.buttonLink || DEFAULT_HERO_SETTINGS.buttonLink,
      next.isActive ? 1 : 0,
      backgroundUrl,
      backgroundStoragePath,
      backgroundFileName,
      adminUid,
    ],
  );

  return fetchHeroSettings();
}
