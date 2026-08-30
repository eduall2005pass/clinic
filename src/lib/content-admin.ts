import { exec, query } from "@/lib/mysql";

let ensureNotificationsTableReady = false;
let ensureJerseysTableReady = false;
// Admin Panel → Content. Notifications broadcast + jersey catalog.
// Media library reads the shared `uploads` table (see src/lib/storage.ts).

export type Notification = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "students" | "admins" | "enrolled" | "student";
  targetEmail: string | null;
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
  featured: boolean;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  audience: string;
  target_email?: string | null;
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
  is_featured: number | boolean;
};

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

const NOTIFICATION_AUDIENCES = [
  "all",
  "students",
  "admins",
  "enrolled",
  "student",
] as const;

function normalizeAudience(value: string): Notification["audience"] {
  // Legacy rows stored the enrolled broadcast as plain "students".
  if (value === "enrolled" || value === "student" || value === "admins") {
    return value;
  }
  return value === "students" ? "students" : "all";
}

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: normalizeAudience(row.audience),
    targetEmail: row.target_email ?? null,
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at),
  };
}

// ── Notifications ────────────────────────────────────────────────────────

async function ensureNotificationsTable(): Promise<void> {
  if (ensureNotificationsTableReady) return;
  await exec(`CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    audience ENUM('all','students','admins','enrolled','student') NOT NULL DEFAULT 'all',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(191) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Older deployments: widen the audience enum + add specific-target columns.
  try {
    await exec(
      `ALTER TABLE notifications
         MODIFY audience ENUM('all','students','admins','enrolled','student') NOT NULL DEFAULT 'all',
         ADD COLUMN target_uid VARCHAR(128) NULL AFTER created_by,
         ADD COLUMN target_email VARCHAR(191) NULL AFTER target_uid`,
    );
  } catch {
    // Already migrated — safe to ignore.
  }
  ensureNotificationsTableReady = true;
}

export async function fetchNotifications(all = false): Promise<Notification[]> {
  try {
    await ensureNotificationsTable();
    const rows = await query<NotificationRow[]>(
      `SELECT * FROM notifications ${all ? "" : "WHERE is_active = 1"} ORDER BY created_at DESC LIMIT 200`,
    );
    return rows.map(mapNotificationRow);
  } catch {
    return [];
  }
}

/**
 * Active notifications relevant to a specific student:
 *  - audience "all" (+ legacy "students") → everyone
 *  - audience "enrolled" → only students with an ACTIVE enrollment
 *  - audience "student" → only the targeted student
 */
export async function fetchStudentNotifications(
  studentUid?: string,
): Promise<Notification[]> {
  try {
    await ensureNotificationsTable();
    if (!studentUid) {
      const rows = await query<NotificationRow[]>(
        `SELECT * FROM notifications
         WHERE is_active = 1 AND audience IN ('all','students')
         ORDER BY created_at DESC LIMIT 200`,
      );
      return rows.map(mapNotificationRow);
    }
    const rows = await query<NotificationRow[]>(
      `SELECT n.* FROM notifications n
       WHERE n.is_active = 1 AND (
         n.audience IN ('all','students')
         OR (n.audience = 'enrolled' AND EXISTS (
               SELECT 1 FROM enrollments e
               WHERE e.student_uid = ? AND e.enrollment_status = 'active'))
         OR (n.audience = 'student' AND n.target_uid = ?)
       )
       ORDER BY n.created_at DESC LIMIT 200`,
      [studentUid, studentUid],
    );
    return rows.map(mapNotificationRow);
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
  const rawAudience =
    typeof input.audience === "string" &&
    (NOTIFICATION_AUDIENCES as readonly string[]).includes(input.audience)
      ? input.audience
      : "all";
  // A specific-student notification requires a target.
  const targetEmail =
    typeof input.targetEmail === "string" && input.targetEmail.trim()
      ? input.targetEmail.trim().toLowerCase()
      : null;
  const targetUid =
    typeof input.targetUid === "string" && input.targetUid.trim()
      ? input.targetUid.trim()
      : null;
  const audience = (
    rawAudience === "student" && !targetEmail && !targetUid ? "all" : rawAudience
  ) as Notification["audience"];
  const id =
    typeof input.id === "string" && input.id.trim()
      ? input.id.trim()
      : `ntf-${Date.now()}`;
  await exec(
    `INSERT INTO notifications (id, title, message, audience, is_active, created_by, target_uid, target_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message),
       audience = VALUES(audience), is_active = VALUES(is_active),
       target_uid = VALUES(target_uid), target_email = VALUES(target_email)`,
    [
      id,
      title,
      message,
      audience,
      input.isActive === false ? 0 : 1,
      adminUid,
      targetUid,
      targetEmail,
    ],
  );
  return fetchNotifications(true);
}

export async function deleteNotification(id: string): Promise<void> {
  await ensureNotificationsTable();
  await exec(`DELETE FROM notifications WHERE id = ?`, [id]);
}

// ── Jerseys ──────────────────────────────────────────────────────────────

async function ensureJerseysTable(): Promise<void> {
  if (ensureJerseysTableReady) return;
  await exec(`CREATE TABLE IF NOT EXISTS jerseys (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    note TEXT NULL,
    image_url VARCHAR(1024) NULL,
    link VARCHAR(1024) NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  try {
    await exec(`ALTER TABLE jerseys ADD COLUMN link VARCHAR(1024) NULL AFTER image_url`);
  } catch {
    // Column already exists — safe to ignore.
  }
  ensureJerseysTableReady = true;
  try {
    await exec(`ALTER TABLE jerseys ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active`);
  } catch {
    // Column already exists — safe to ignore.
  }
}

export async function fetchActiveJerseys(): Promise<JerseyItem[]> {
  const jerseys = await fetchJerseys();
  return jerseys.filter((jersey) => jersey.isActive && jersey.image);
}

export async function fetchFeaturedJerseys(): Promise<JerseyItem[]> {
  const jerseys = await fetchActiveJerseys();
  return jerseys.filter((jersey) => jersey.featured);
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
      featured: Boolean(row.is_featured),
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
    `INSERT INTO jerseys (id, name, note, image_url, link, price, is_active, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), note = VALUES(note),
       image_url = VALUES(image_url), link = VALUES(link), price = VALUES(price),
       is_active = VALUES(is_active), is_featured = VALUES(is_featured)`,
    [
      id,
      name,
      typeof input.note === "string" && input.note.trim() ? input.note.trim() : null,
      typeof input.image === "string" && input.image.trim() ? input.image.trim() : null,
      typeof input.link === "string" && input.link.trim() ? input.link.trim() : null,
      Math.max(0, Number(input.price) || 0),
      input.isActive === false ? 0 : 1,
      input.featured === true ? 1 : 0,
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

/**
 * Columns that may hold a managed upload reference ("/api/files/<id>" or a
 * storage path). Used to detect unused files in the Media Library.
 */
const MEDIA_REFERENCE_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "banners", column: "url" },
  { table: "banners", column: "storage_path" },
  { table: "logos", column: "url" },
  { table: "logos", column: "storage_path" },
  { table: "course_categories", column: "image_url" },
  { table: "course_categories", column: "image_storage_path" },
  { table: "catalog_courses", column: "image_url" },
  { table: "catalog_courses", column: "teacher_photo_url" },
  { table: "admin_courses", column: "image_url" },
  { table: "admin_courses", column: "image_storage_path" },
  { table: "homepage_courses", column: "image_url" },
  { table: "students", column: "profile_picture_url" },
  { table: "admins", column: "photo_url" },
  { table: "jerseys", column: "image_url" },
  { table: "mentors", column: "photo_url" },
  { table: "mentors", column: "photo_storage_path" },
  { table: "reviews", column: "photo_url" },
  { table: "reviews", column: "photo_storage_path" },
  { table: "seo_settings", column: "og_image_url" },
  { table: "hero_settings", column: "background_url" },
];

/** All upload ids referenced anywhere in the content tables. */
async function fetchReferencedUploadIds(): Promise<Set<string>> {
  const referenced = new Set<string>();
  for (const { table, column } of MEDIA_REFERENCE_COLUMNS) {
    try {
      const rows = await query<{ value: string | null }[]>(
        `SELECT ${column} AS value FROM ${table}`,
      );
      for (const row of rows) {
        const value = row.value;
        if (typeof value !== "string") continue;
        // Match "/api/files/<uuid>" anywhere in the stored value.
        const matches = value.matchAll(/\/api\/files\/([0-9a-f-]{16,64})/gi);
        for (const match of matches) {
          if (match[1]) referenced.add(match[1].toLowerCase());
        }
      }
    } catch {
      // Table/column may not exist on older databases — skip it.
    }
  }
  return referenced;
}

/**
 * Uploads not referenced by any content table — safe-to-delete candidates.
 */
export async function findUnusedUploads(): Promise<MediaItem[]> {
  const [media, referenced] = await Promise.all([
    fetchMediaLibrary(500),
    fetchReferencedUploadIds(),
  ]);
  return media.filter((item) => !referenced.has(item.id.toLowerCase()));
}

/** Delete every unreferenced upload. Returns how many were removed. */
export async function deleteUnusedMedia(): Promise<number> {
  const unused = await findUnusedUploads();
  let count = 0;
  for (const item of unused) {
    try {
      const deleted = await removeUploadRow(item.id);
      if (deleted) count += 1;
    } catch {
      // Skip failures and continue.
    }
  }
  return count;
}

async function removeUploadRow(id: string): Promise<boolean> {
  const result = await exec(`DELETE FROM uploads WHERE id = ?`, [id]);
  return (result.affectedRows ?? 0) > 0;
}
