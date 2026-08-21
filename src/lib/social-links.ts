import { exec, query } from "@/lib/mysql";
import { getWebsiteSettingsWithFallback } from "@/lib/website-settings";
import {
  SOCIAL_PLATFORMS,
  getSocialLabel,
  type SocialLink,
  type SocialPlatformKey,
} from "@/lib/social-links-constants";

type SocialLinkRow = {
  platform_key: string;
  url: string | null;
  is_active: number | boolean;
};

async function ensureSocialLinksTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS social_links (
      platform_key VARCHAR(50) NOT NULL PRIMARY KEY,
      url VARCHAR(1024) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by VARCHAR(191) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

async function seedDefaults(): Promise<void> {
  for (let index = 0; index < SOCIAL_PLATFORMS.length; index += 1) {
    await query(
      `INSERT IGNORE INTO social_links (platform_key, sort_order, is_active)
       VALUES (?, ?, 1)`,
      [SOCIAL_PLATFORMS[index].key, index + 1],
    );
  }
}

async function ensureSchema(): Promise<void> {
  await ensureSocialLinksTable();
  await seedDefaults();
}

/**
 * All social platforms with their state.
 * Falls back to website_settings URLs when the table is empty/unavailable
 * so the footer keeps working before the migration is applied.
 */
export async function fetchAllSocialLinks(): Promise<SocialLink[]> {
  try {
    await ensureSchema();
    const rows = await query<SocialLinkRow[]>(
      `SELECT platform_key, url, is_active FROM social_links ORDER BY sort_order ASC`,
    );

    if (rows.length === 0) return await buildFallback();

    const byKey = new Map(rows.map((row) => [row.platform_key, row]));
    return SOCIAL_PLATFORMS.map(({ key }) => {
      const row = byKey.get(key);
      return {
        key,
        label: getSocialLabel(key),
        url: row?.url ?? null,
        isActive: row ? Boolean(row.is_active) : true,
      };
    });
  } catch {
    return buildFallback();
  }
}

/** Active platforms only — used by the live website footer. */
export async function fetchActiveSocialLinks(): Promise<SocialLink[]> {
  const all = await fetchAllSocialLinks();
  return all.filter((link) => link.isActive && link.url);
}

async function buildFallback(): Promise<SocialLink[]> {
  const settings = await getWebsiteSettingsWithFallback();
  return [
    {
      key: "facebook",
      label: "Facebook",
      url: settings.facebookUrl || null,
      isActive: Boolean(settings.facebookUrl),
    },
    {
      key: "youtube",
      label: "YouTube",
      url: settings.youtubeUrl || null,
      isActive: Boolean(settings.youtubeUrl),
    },
  ];
}

export type SocialLinkUpdate = {
  key: SocialPlatformKey;
  url: string | null;
  isActive: boolean;
};

export async function saveSocialLinks(
  updates: SocialLinkUpdate[],
  adminUid: string,
): Promise<SocialLink[]> {
  await ensureSchema();

  for (const update of updates) {
    if (update.url && !isValidHttpUrl(update.url)) {
      throw new Error(
        `${getSocialLabel(update.key)} link must be a valid https:// URL.`,
      );
    }
  }

  for (let index = 0; index < updates.length; index += 1) {
    const update = updates[index];
    await query(
      `INSERT INTO social_links (platform_key, url, is_active, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         url = VALUES(url),
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order),
         updated_by = VALUES(updated_by)`,
      [
        update.key,
        update.url?.trim() || null,
        update.isActive ? 1 : 0,
        index + 1,
        adminUid,
      ],
    );
  }

  return fetchAllSocialLinks();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
