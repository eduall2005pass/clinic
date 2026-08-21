import { exec, query } from "@/lib/mysql";

export type PromotionKind = "offer" | "campaign";

export type Promotion = {
  id: string;
  kind: PromotionKind;
  title: string;
  description: string | null;
  linkHref: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
};

type PromotionRow = {
  id: string;
  kind: PromotionKind;
  title: string;
  description: string | null;
  link_href: string | null;
  is_active: number | boolean;
  start_at: Date | string | null;
  end_at: Date | string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function rowToPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    kind: row.kind === "campaign" ? "campaign" : "offer",
    title: row.title,
    description: row.description ?? null,
    linkHref: row.link_href ?? null,
    isActive: Boolean(row.is_active),
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
  };
}

async function ensurePromotionsTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS promotions (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      kind ENUM('offer', 'campaign') NOT NULL DEFAULT 'offer',
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      link_href VARCHAR(1024) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      start_at DATETIME NULL,
      end_at DATETIME NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

/** All promotions of a kind (any state/date) — used by the Admin Panel. */
export async function fetchAllPromotions(
  kind: PromotionKind,
): Promise<Promotion[]> {
  try {
    await ensurePromotionsTable();
    const rows = await query<PromotionRow[]>(
      `SELECT id, kind, title, description, link_href, is_active, start_at, end_at
       FROM promotions WHERE kind = ? ORDER BY sort_order ASC, created_at DESC`,
      [kind],
    );
    return rows.map(rowToPromotion);
  } catch {
    return [];
  }
}

/** Active promotions within their date window — used by the live website. */
export async function fetchActivePromotions(
  kind: PromotionKind,
): Promise<Promotion[]> {
  const all = await fetchAllPromotions(kind);
  const now = Date.now();
  return all.filter((promotion) => {
    if (!promotion.isActive) return false;
    if (promotion.startAt && Date.parse(promotion.startAt) > now) return false;
    if (promotion.endAt && Date.parse(promotion.endAt) < now) return false;
    return true;
  });
}

export type PromotionSaveInput = {
  id?: string;
  kind: PromotionKind;
  title: string;
  description?: string | null;
  linkHref?: string | null;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

function generatePromotionId(kind: PromotionKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseDateInput(value: string | null | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function savePromotion(
  input: PromotionSaveInput,
): Promise<Promotion[]> {
  await ensurePromotionsTable();

  const id = input.id ?? generatePromotionId(input.kind);
  const title = input.title.trim();
  if (title.length === 0 || title.length > 255) {
    throw new Error("Title is required and must be under 255 characters.");
  }

  const linkHref = input.linkHref?.trim() || null;
  if (linkHref && !linkHref.startsWith("/") && !isValidHttpUrl(linkHref)) {
    throw new Error(
      "Link must be a valid https:// URL or an internal path (/...).",
    );
  }

  const startAt = parseDateInput(input.startAt);
  const endAt = parseDateInput(input.endAt);
  if (startAt && endAt && Date.parse(endAt) < Date.parse(startAt)) {
    throw new Error("End date must be after the start date.");
  }

  const existingRows = await query<{ sort_order: number }[]>(
    "SELECT sort_order FROM promotions WHERE id = ? LIMIT 1",
    [id],
  );
  const sortOrder =
    existingRows[0]?.sort_order ??
    (
      await query<{ next_order: number }[]>(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM promotions WHERE kind = ?",
        [input.kind],
      )
    )[0]?.next_order ??
    1;

  await exec(
    `INSERT INTO promotions
       (id, kind, title, description, link_href, is_active, start_at, end_at, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       link_href = VALUES(link_href),
       is_active = VALUES(is_active),
       start_at = VALUES(start_at),
       end_at = VALUES(end_at)`,
    [
      id,
      input.kind,
      title,
      input.description?.trim() || null,
      linkHref,
      input.isActive === true ? 1 : 0,
      startAt ? startAt.slice(0, 19).replace("T", " ") : null,
      endAt ? endAt.slice(0, 19).replace("T", " ") : null,
      sortOrder,
    ],
  );

  return fetchAllPromotions(input.kind);
}

export async function setPromotionActive(
  kind: PromotionKind,
  id: string,
  active: boolean,
): Promise<Promotion[]> {
  await ensurePromotionsTable();
  await exec("UPDATE promotions SET is_active = ? WHERE id = ?", [
    active ? 1 : 0,
    id,
  ]);
  return fetchAllPromotions(kind);
}

export async function reorderPromotions(
  kind: PromotionKind,
  orderedIds: string[],
): Promise<Promotion[]> {
  await ensurePromotionsTable();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec("UPDATE promotions SET sort_order = ? WHERE id = ?", [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchAllPromotions(kind);
}

export async function deletePromotion(
  kind: PromotionKind,
  id: string,
): Promise<Promotion[]> {
  try {
    await ensurePromotionsTable();
    await exec("DELETE FROM promotions WHERE id = ? AND kind = ?", [id, kind]);
  } catch {
    // Best effort.
  }
  return fetchAllPromotions(kind);
}
