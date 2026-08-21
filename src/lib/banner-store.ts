import { exec, query } from "@/lib/mysql";
import { saveFile } from "@/lib/storage";

export const BANNER_STORAGE_DIR = "website-banners";

export type CustomBanner = {
  id: string;
  url: string;
  href: string | null;
  title: string | null;
  isActive: boolean;
  fileName: string;
  storagePath: string;
  updatedAt: number;
};

type BannerRow = {
  id: string;
  url: string;
  href: string | null;
  title: string | null;
  is_active: number | boolean;
  file_name: string;
  storage_path: string;
  updated_at: Date | string;
};

const SEED_BANNERS: Array<{ id: string; url: string; href: string; title: string }> = [
  {
    id: "featured-course-1",
    url: "/banners/featured-course-1.svg",
    href: "#featured-courses",
    title: "Featured Course",
  },
  {
    id: "featured-course-2",
    url: "/banners/featured-course-2.svg",
    href: "#featured-courses",
    title: "Featured Course",
  },
  {
    id: "public-exam",
    url: "/banners/public-exam.svg",
    href: "/exam",
    title: "MediSpark Public Exam",
  },
  {
    id: "jersey-of-medispark",
    url: "/banners/jersey-of-medispark.svg",
    href: "#jerseys",
    title: "Jersey of MediSpark",
  },
];

async function ensureBannersTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS banners (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      url VARCHAR(1024) NOT NULL,
      href VARCHAR(1024) NULL,
      title VARCHAR(255) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      file_name VARCHAR(255) NOT NULL,
      storage_path VARCHAR(1024) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  // Older databases may pre-date the title/is_active columns.
  try {
    await exec("ALTER TABLE banners ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL");
    await exec(
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1",
    );
  } catch {
    // Best effort — column may already exist.
  }
}

async function seedDefaultBanners(): Promise<void> {
  for (let index = 0; index < SEED_BANNERS.length; index += 1) {
    const banner = SEED_BANNERS[index];
    await query(
      `INSERT IGNORE INTO banners (id, url, href, title, is_active, file_name, storage_path, sort_order)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        banner.id,
        banner.url,
        banner.href,
        banner.title,
        banner.id + ".svg",
        banner.url,
        index + 1,
      ],
    );
  }
}

async function ensureSchema(): Promise<void> {
  await ensureBannersTable();
  await seedDefaultBanners();
}

function rowToBanner(row: BannerRow): CustomBanner {
  return {
    id: row.id,
    url: row.url,
    href: row.href ?? null,
    title: row.title ?? null,
    isActive: Boolean(row.is_active),
    fileName: row.file_name,
    storagePath: row.storage_path,
    updatedAt: Date.parse(
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    ),
  };
}

async function deleteBannerFile(
  storagePath: string | null | undefined,
): Promise<void> {
  if (typeof storagePath !== "string" || storagePath.length === 0) return;
  // Only remove files managed by the uploads system — never static assets.
  if (!storagePath.startsWith(BANNER_STORAGE_DIR)) return;
  try {
    const { removeFile } = await import("@/lib/storage");
    await removeFile(storagePath);
  } catch {
    // Best-effort cleanup.
  }
}

/** All banners (including inactive), ordered — used by the Admin Panel. */
export async function fetchAllBanners(): Promise<CustomBanner[]> {
  try {
    await ensureSchema();
    const rows = await query<BannerRow[]>(
      `SELECT id, url, href, title, is_active, file_name, storage_path, updated_at
       FROM banners ORDER BY sort_order ASC, created_at ASC`,
    );
    return rows.map(rowToBanner);
  } catch {
    return [];
  }
}

/** Active banners only — used by the live homepage slider. */
export async function fetchActiveBanners(): Promise<CustomBanner[] | null> {
  try {
    await ensureSchema();
    const rows = await query<BannerRow[]>(
      `SELECT id, url, href, title, is_active, file_name, storage_path, updated_at
       FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC`,
    );
    const slides = rows.map(rowToBanner);
    return slides.length > 0 ? slides : null;
  } catch {
    return null;
  }
}

// Backwards-compatible alias (now returns active banners only).
export async function fetchCustomBanners(): Promise<CustomBanner[] | null> {
  return fetchActiveBanners();
}

export async function saveCustomBanner(input: {
  file?: File;
  id?: string;
  href: string | null;
  title?: string | null;
  width?: number;
  height?: number;
}): Promise<CustomBanner[]> {
  const isNew = !input.file || !input.id;

  let url: string;
  let storagePath: string;
  let fileName: string;

  if (input.file) {
    const extension = input.file.name.includes(".")
      ? `.${input.file.name.split(".").pop()?.toLowerCase() ?? ""}`
      : ".png";
    fileName = `${input.id ?? "banner"}-${Date.now()}${extension}`;
    url = await saveFile(
      BANNER_STORAGE_DIR,
      fileName,
      await input.file.arrayBuffer(),
    );
    storagePath = `${BANNER_STORAGE_DIR}/${fileName}`;
  } else {
    // Meta-only update path should not reach here; keep previous image.
    throw new Error("No banner file provided.");
  }

  await ensureSchema();

  const id = isNew ? generateBannerId() : (input.id as string);

  const previousRows = await query<{ storage_path: string }[]>(
    "SELECT storage_path FROM banners WHERE id = ? LIMIT 1",
    [id],
  );
  const previousPath = previousRows[0]?.storage_path;
  const existingRows = await query<{ sort_order: number }[]>(
    "SELECT sort_order FROM banners WHERE id = ? LIMIT 1",
    [id],
  );

  let sortOrder: number;
  if (existingRows.length === 0 && isNew) {
    const maxRow = await query<{ next_order: number }[]>(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM banners",
    );
    sortOrder = Number(maxRow[0]?.next_order ?? 1);
  } else {
    sortOrder = Number(existingRows[0]?.sort_order ?? 1);
  }

  await exec(
    `INSERT INTO banners (id, url, href, title, is_active, file_name, storage_path, sort_order)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      url = VALUES(url),
      href = VALUES(href),
      title = VALUES(title),
      file_name = VALUES(file_name),
      storage_path = VALUES(storage_path)`,
    [id, url, input.href, input.title ?? null, input.file.name, storagePath, sortOrder],
  );

  if (previousPath && previousPath !== storagePath) {
    await deleteBannerFile(previousPath);
  }

  return fetchAllBanners();
}

function generateBannerId(): string {
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type BannerMetaPatch = {
  title?: string | null;
  href?: string | null;
  isActive?: boolean;
};

export async function updateBannerMeta(
  id: string,
  patch: BannerMetaPatch,
): Promise<CustomBanner[]> {
  await ensureSchema();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.title !== undefined) {
    sets.push("title = ?");
    values.push(patch.title?.trim() || null);
  }
  if (patch.href !== undefined) {
    sets.push("href = ?");
    values.push(patch.href?.trim() || null);
  }
  if (patch.isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(patch.isActive ? 1 : 0);
  }

  if (sets.length > 0) {
    values.push(id);
    await exec(`UPDATE banners SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  return fetchAllBanners();
}

export async function reorderBanners(orderedIds: string[]): Promise<CustomBanner[]> {
  await ensureSchema();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec("UPDATE banners SET sort_order = ? WHERE id = ?", [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchAllBanners();
}

export async function removeCustomBanner(id: string): Promise<CustomBanner[]> {
  try {
    const rows = await query<{ storage_path: string }[]>(
      "SELECT storage_path FROM banners WHERE id = ? LIMIT 1",
      [id],
    );
    await exec("DELETE FROM banners WHERE id = ?", [id]);
    if (rows[0]?.storage_path) {
      await deleteBannerFile(rows[0].storage_path);
    }
    return fetchAllBanners();
  } catch {
    return fetchAllBanners();
  }
}
