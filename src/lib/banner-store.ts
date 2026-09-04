import { exec, query, ensureColumn } from "@/lib/mysql";
import { saveFile } from "@/lib/storage";

let bannerSchemaReady = false;
let ensureBannersTableReady = false;
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
  startAt: string | null;
  endAt: string | null;
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
  start_at?: Date | string | null;
  end_at?: Date | string | null;
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

let bannersEnsured = false;

async function ensureBannersTable(): Promise<void> {
  if (ensureBannersTableReady || bannersEnsured) return;
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
    await ensureColumn("banners", "title", "VARCHAR(255) NULL");
    await ensureColumn("banners", "is_active", "TINYINT(1) NOT NULL DEFAULT 1\", ); await ensureColumn(\"banners\", \"start_at\", \"DATETIME NULL");
    await ensureColumn("banners", "end_at", "DATETIME NULL");
  } catch {
    // Best effort — column may already exist.
  }
  ensureBannersTableReady = true;
  bannersEnsured = true;
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
  if (bannerSchemaReady) return;
  await ensureBannersTable();
  await seedDefaultBanners();
  bannerSchemaReady = true;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
  };
}

function isWithinDateWindow(
  banner: Pick<CustomBanner, "startAt" | "endAt">,
  now: number,
): boolean {
  if (banner.startAt && Date.parse(banner.startAt) > now) return false;
  if (banner.endAt && Date.parse(banner.endAt) < now) return false;
  return true;
}

async function deleteBannerFile(
  storagePath: string | null | undefined,
): Promise<void> {
  if (typeof storagePath !== "string" || storagePath.length === 0) return;
  // Only remove VM-managed files — never static assets like /banners/*.svg
  // Check both relative paths and full VM URLs
  const isManaged =
    storagePath.startsWith(BANNER_STORAGE_DIR) ||
    storagePath.includes(BANNER_STORAGE_DIR) ||
    storagePath.includes("/medifiles/");
  if (!isManaged) return;
  // Also reject obvious static assets
  if (storagePath.startsWith("/banners/")) return;
  try {
    const { removeFile, isLocalUpload } = await import("@/lib/storage");
    if (!isLocalUpload(storagePath) && !storagePath.includes("/medifiles/")) return;
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
      `SELECT id, url, href, title, is_active, file_name, storage_path, updated_at,
              start_at, end_at
       FROM banners ORDER BY sort_order ASC, created_at ASC`,
    );
    return rows.map(rowToBanner);
  } catch {
    return [];
  }
}

/** Active banners within their date window — used by the live homepage slider. */
export async function fetchActiveBanners(): Promise<CustomBanner[] | null> {
  try {
    await ensureSchema();
    const rows = await query<BannerRow[]>(
      `SELECT id, url, href, title, is_active, file_name, storage_path, updated_at,
              start_at, end_at
       FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC`,
    );
    const now = Date.now();
    const slides = rows
      .map(rowToBanner)
      .filter((banner) => isWithinDateWindow(banner, now));
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
  startAt?: string | null;
  endAt?: string | null;
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
    storagePath = url;
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
    `INSERT INTO banners (id, url, href, title, is_active, file_name, storage_path, sort_order, start_at, end_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      url = VALUES(url),
      href = VALUES(href),
      title = VALUES(title),
      file_name = VALUES(file_name),
      storage_path = VALUES(storage_path),
      start_at = VALUES(start_at),
      end_at = VALUES(end_at)`,
    [
      id,
      url,
      input.href,
      input.title ?? null,
      input.file.name,
      storagePath,
      sortOrder,
      parseDateInput(input.startAt),
      parseDateInput(input.endAt),
    ],
  );

  if (previousPath && previousPath !== storagePath) {
    await deleteBannerFile(previousPath);
  }

  return fetchAllBanners();
}

function generateBannerId(): string {
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseDateInput(value: string | null | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace("T", " ");
}

export type BannerMetaPatch = {
  title?: string | null;
  href?: string | null;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
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
  if (patch.startAt !== undefined) {
    sets.push("start_at = ?");
    values.push(parseDateInput(patch.startAt));
  }
  if (patch.endAt !== undefined) {
    sets.push("end_at = ?");
    values.push(parseDateInput(patch.endAt));
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
