import { exec, query } from "@/lib/mysql";

// Admin Panel → Content. Notifications broadcast + jersey catalog.
// Media library reads the shared `uploads` table (see src/lib/storage.ts).

export type Notification = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "students" | "admins";
  isActive: boolean;
  createdAt: string;
};

export type JerseyItem = {
  id: string;
  name: string;
  note: string | null;
  image: string | null;
  link: string | null;
  price: number;
  isActive: boolean;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  audience: string;
  is_active: number | boolean;
  created_at: Date | string;
};

type JerseyRow = {
  id: string;
  name: string;
  note: string | null;
  image_url: string | null;
  link: string | null;
  price: string | number;
  is_active: number | boolean;
};

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

// ── Notifications ────────────────────────────────────────────────────────

async function ensureNotificationsTable(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    audience ENUM('all','students','admins') NOT NULL DEFAULT 'all',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(191) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

export async function fetchNotifications(all = false): Promise<Notification[]> {
  try {
    await ensureNotificationsTable();
    const rows = await query<NotificationRow[]>(
      `SELECT * FROM notifications ${all ? "" : "WHERE is_active = 1"} ORDER BY created_at DESC LIMIT 200`,
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      audience:
        row.audience === "students"
          ? "students"
          : row.audience === "admins"
            ? "admins"
            : "all",
      isActive: Boolean(row.is_active),
      createdAt: toIso(row.created_at),
    }));
  } catch {
    return [];
  }
}

export async function saveNotification(
  input: Record<string, unknown>,
  adminUid: string,
): Promise<Notification[]> {
  await ensureNotificationsTable();
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (title.length < 2) throw new Error("Notification title is required.");
  if (message.length < 2) throw new Error("Notification message is required.");
  const audience =
    input.audience === "students" || input.audience === "admins"
      ? input.audience
      : "all";
  const id =
    typeof input.id === "string" && input.id.trim()
      ? input.id.trim()
      : `ntf-${Date.now()}`;
  await exec(
    `INSERT INTO notifications (id, title, message, audience, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message),
       audience = VALUES(audience), is_active = VALUES(is_active)`,
    [id, title, message, audience, input.isActive === false ? 0 : 1, adminUid],
  );
  return fetchNotifications(true);
}

export async function deleteNotification(id: string): Promise<void> {
  await ensureNotificationsTable();
  await exec(`DELETE FROM notifications WHERE id = ?`, [id]);
}

// ── Jerseys ──────────────────────────────────────────────────────────────

async function ensureJerseysTable(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS jerseys (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    note TEXT NULL,
    image_url VARCHAR(1024) NULL,
    link VARCHAR(1024) NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Older deployments created the table without the link column.
  try {
    await exec(`ALTER TABLE jerseys ADD COLUMN link VARCHAR(1024) NULL AFTER image_url`);
  } catch {
    // Column already exists — safe to ignore.
  }
}

export async function fetchActiveJerseys(): Promise<JerseyItem[]> {
  const jerseys = await fetchJerseys();
  return jerseys.filter((jersey) => jersey.isActive && jersey.image);
}

export async function fetchJerseys(): Promise<JerseyItem[]> {
  try {
    await ensureJerseysTable();
    const rows = await query<JerseyRow[]>(
      `SELECT * FROM jerseys ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      image: row.image_url,
      link: row.link ?? null,
      price: Number(row.price) || 0,
      isActive: Boolean(row.is_active),
    }));
  } catch {
    return [];
  }
}

export async function saveJersey(
  input: Record<string, unknown>,
): Promise<JerseyItem[]> {
  await ensureJerseysTable();
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2) throw new Error("Jersey name is required.");
  const id =
    typeof input.id === "string" && input.id.trim()
      ? input.id.trim()
      : `jersey-${Date.now()}`;
  await exec(
    `INSERT INTO jerseys (id, name, note, image_url, link, price, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), note = VALUES(note),
       image_url = VALUES(image_url), link = VALUES(link), price = VALUES(price), is_active = VALUES(is_active)`,
    [
      id,
      name,
      typeof input.note === "string" && input.note.trim() ? input.note.trim() : null,
      typeof input.image === "string" && input.image.trim() ? input.image.trim() : null,
      typeof input.link === "string" && input.link.trim() ? input.link.trim() : null,
      Math.max(0, Number(input.price) || 0),
      input.isActive === false ? 0 : 1,
    ],
  );
  return fetchJerseys();
}

export async function deleteJersey(id: string): Promise<void> {
  await ensureJerseysTable();
  await exec(`DELETE FROM jerseys WHERE id = ?`, [id]);
}

// ── Media library ────────────────────────────────────────────────────────

export type MediaItem = {
  id: string;
  fileName: string;
  directory: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export async function fetchMediaLibrary(limit = 200): Promise<MediaItem[]> {
  try {
    const rows = await query<{
      id: string;
      file_name: string;
      directory: string;
      mime_type: string;
      size: number;
      created_at: Date | string;
    }[]>(
      `SELECT id, file_name, directory, mime_type, size, created_at
       FROM uploads ORDER BY created_at DESC LIMIT ${Math.min(500, Math.max(1, limit))}`,
    );
    return rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      directory: row.directory,
      mimeType: row.mime_type,
      size: row.size ?? 0,
      url: `/api/files/${row.id}`,
      createdAt: toIso(row.created_at),
    }));
  } catch {
    return [];
  }
}

export async function deleteMediaItem(id: string): Promise<boolean> {
  const result = await exec(`DELETE FROM uploads WHERE id = ?`, [id]);
  return (result.affectedRows ?? 0) > 0;
}

/** Total uploads count and bytes — used by System → Storage. */
export async function fetchUploadStats(): Promise<{ files: number; bytes: number }> {
  try {
    const rows = await query<{ files: number; bytes: string | number | null }[]>(
      `SELECT COUNT(*) AS files, SUM(size) AS bytes FROM uploads`,
    );
    return {
      files: rows[0]?.files ?? 0,
      bytes: Number(rows[0]?.bytes ?? 0) || 0,
    };
  } catch {
    return { files: 0, bytes: 0 };
  }
}
