import { exec, query } from "@/lib/mysql";

export type Announcement = {
  id: string;
  title: string;
  description: string | null;
  buttonText: string | null;
  buttonHref: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  description: string | null;
  button_text: string | null;
  button_href: string | null;
  is_active: number | boolean;
  start_at: Date | string | null;
  end_at: Date | string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    buttonText: row.button_text ?? null,
    buttonHref: row.button_href ?? null,
    isActive: Boolean(row.is_active),
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
  };
}

async function ensureAnnouncementsTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      button_text VARCHAR(100) NULL,
      button_href VARCHAR(1024) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      start_at DATETIME NULL,
      end_at DATETIME NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

/** All announcements (any state/date) — used by the Admin Panel. */
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  try {
    await ensureAnnouncementsTable();
    const rows = await query<AnnouncementRow[]>(
      `SELECT id, title, description, button_text, button_href, is_active, start_at, end_at
       FROM announcements ORDER BY sort_order ASC, created_at DESC`,
    );
    return rows.map(rowToAnnouncement);
  } catch {
    return [];
  }
}

/** Active announcements within their date window — used by the live website. */
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const all = await fetchAllAnnouncements();
  const now = Date.now();
  return all.filter((announcement) => {
    if (!announcement.isActive) return false;
    if (announcement.startAt && Date.parse(announcement.startAt) > now) return false;
    if (announcement.endAt && Date.parse(announcement.endAt) < now) return false;
    return true;
  });
}

export type AnnouncementSaveInput = {
  id?: string;
  title: string;
  description?: string | null;
  buttonText?: string | null;
  buttonHref?: string | null;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

function generateAnnouncementId(): string {
  return `announce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseDateInput(value: string | null | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function saveAnnouncement(
  input: AnnouncementSaveInput,
): Promise<Announcement[]> {
  await ensureAnnouncementsTable();

  const id = input.id ?? generateAnnouncementId();
  const title = input.title.trim();
  if (title.length === 0 || title.length > 255) {
    throw new Error("Title is required and must be under 255 characters.");
  }

  const buttonText = input.buttonText?.trim() || null;
  const buttonHref = input.buttonHref?.trim() || null;
  if (buttonText && !buttonHref) {
    throw new Error("Button link is required when button text is set.");
  }
  if (buttonHref && !buttonHref.startsWith("/") && !isValidHttpUrl(buttonHref)) {
    throw new Error("Button link must be a valid https:// URL or an internal path (/...).");
  }

  const startAt = parseDateInput(input.startAt);
  const endAt = parseDateInput(input.endAt);
  if (startAt && endAt && Date.parse(endAt) < Date.parse(startAt)) {
    throw new Error("End date must be after the start date.");
  }

  const existingRows = await query<{ sort_order: number }[]>(
    "SELECT sort_order FROM announcements WHERE id = ? LIMIT 1",
    [id],
  );
  const sortOrder =
    existingRows[0]?.sort_order ??
    (
      await query<{ next_order: number }[]>(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM announcements",
      )
    )[0]?.next_order ??
    1;

  await exec(
    `INSERT INTO announcements
       (id, title, description, button_text, button_href, is_active, start_at, end_at, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       button_text = VALUES(button_text),
       button_href = VALUES(button_href),
       is_active = VALUES(is_active),
       start_at = VALUES(start_at),
       end_at = VALUES(end_at)`,
    [
      id,
      title,
      input.description?.trim() || null,
      buttonText,
      buttonHref,
      input.isActive === true ? 1 : 0,
      startAt ? startAt.slice(0, 19).replace("T", " ") : null,
      endAt ? endAt.slice(0, 19).replace("T", " ") : null,
      sortOrder,
    ],
  );

  return fetchAllAnnouncements();
}

export async function setAnnouncementActive(
  id: string,
  active: boolean,
): Promise<Announcement[]> {
  await ensureAnnouncementsTable();
  await exec("UPDATE announcements SET is_active = ? WHERE id = ?", [
    active ? 1 : 0,
    id,
  ]);
  return fetchAllAnnouncements();
}

export async function reorderAnnouncements(
  orderedIds: string[],
): Promise<Announcement[]> {
  await ensureAnnouncementsTable();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec("UPDATE announcements SET sort_order = ? WHERE id = ?", [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchAllAnnouncements();
}

export async function deleteAnnouncement(id: string): Promise<Announcement[]> {
  try {
    await ensureAnnouncementsTable();
    await exec("DELETE FROM announcements WHERE id = ?", [id]);
  } catch {
    // Best effort.
  }
  return fetchAllAnnouncements();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
