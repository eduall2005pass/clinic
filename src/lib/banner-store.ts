import { exec, query } from "@/lib/mysql";
import { saveFile, removeFile } from "@/lib/storage";

export const BANNER_STORAGE_DIR = "website-banners";

export type CustomBanner = {
  id: string;
  url: string;
  href: string | null;
  fileName: string;
  storagePath: string;
  updatedAt: number;
};

type BannerRow = {
  id: string;
  url: string;
  href: string | null;
  file_name: string;
  storage_path: string;
  updated_at: Date | string;
};

async function ensureBannersTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS banners (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      url VARCHAR(1024) NOT NULL,
      href VARCHAR(1024) NULL,
      file_name VARCHAR(255) NOT NULL,
      storage_path VARCHAR(1024) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

function rowToBanner(row: BannerRow): CustomBanner {
  return {
    id: row.id,
    url: row.url,
    href: row.href ?? null,
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
  try {
    await removeFile(storagePath);
  } catch {
    // Best-effort cleanup.
  }
}

export async function fetchCustomBanners(): Promise<CustomBanner[] | null> {
  try {
    await ensureBannersTable();
    const rows = await query<BannerRow[]>(
      "SELECT id, url, href, file_name, storage_path, updated_at FROM banners ORDER BY sort_order ASC, created_at ASC",
    );
    const slides = rows.map(rowToBanner);
    return slides.length > 0 ? slides : null;
  } catch {
    return null;
  }
}

export async function saveCustomBanner(input: {
  file: File;
  id: string;
  href: string | null;
  width: number;
  height: number;
}): Promise<CustomBanner[]> {
  const extension = input.file.name.includes(".")
    ? `.${input.file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const fileName = `${input.id}-${Date.now()}${extension}`;
  const url = await saveFile(
    BANNER_STORAGE_DIR,
    fileName,
    await input.file.arrayBuffer(),
  );
  const storagePath = `${BANNER_STORAGE_DIR}/${fileName}`;

  await ensureBannersTable();

  const previousRows = await query<{ storage_path: string }[]>(
    "SELECT storage_path FROM banners WHERE id = ? LIMIT 1",
    [input.id],
  );
  const previousPath = previousRows[0]?.storage_path;

  const maxRow = await query<{ next_order: number }[]>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM banners",
  );
  const sortOrder = Number(maxRow[0]?.next_order ?? 1);

  await exec(
    `INSERT INTO banners (id, url, href, file_name, storage_path, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      url = VALUES(url),
      href = VALUES(href),
      file_name = VALUES(file_name),
      storage_path = VALUES(storage_path)`,
    [input.id, url, input.href, input.file.name, storagePath, sortOrder],
  );

  if (previousPath && previousPath !== storagePath) {
    await deleteBannerFile(previousPath);
  }

  return (await fetchCustomBanners()) ?? [];
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
    return (await fetchCustomBanners()) ?? [];
  } catch {
    return [];
  }
}
