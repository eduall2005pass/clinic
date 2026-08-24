import { query } from "@/lib/mysql";
import { saveFile, removeFile } from "@/lib/storage";

export const MENTOR_PHOTO_DIR = "mentor-photos";
export const MAX_MENTOR_PHOTO_SIZE = 5 * 1024 * 1024;
export const ALLOWED_MENTOR_PHOTO_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export type Mentor = {
  id: string;
  name: string;
  subject: string;
  qualification: string | null;
  isFounder: boolean;
  isDeveloper: boolean;
  note: string;
  initials: string;
  isActive: boolean;
  photoUrl: string | null;
  bio: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
};

export const DEFAULT_MENTORS: Mentor[] = [
  {
    id: "mentor-anika-rahman",
    name: "Dr. Anika Rahman",
    subject: "Biology & Anatomy",
    qualification: null,
    isFounder: false,
    isDeveloper: false,
    note: "Makes complex biology topics simple and exam-focused.",
    initials: "AR",
    isActive: true,
    photoUrl: null,
    bio: null,
    socialFacebook: null,
    socialInstagram: null,
    socialLinkedin: null,
    socialYoutube: null,
  },
  {
    id: "mentor-shafiqul-islam",
    name: "Prof. Shafiqul Islam",
    subject: "Chemistry",
    qualification: null,
    isFounder: false,
    isDeveloper: false,
    note: "Guides students through every chapter with clarity.",
    initials: "SI",
    isActive: true,
    photoUrl: null,
    bio: null,
    socialFacebook: null,
    socialInstagram: null,
    socialLinkedin: null,
    socialYoutube: null,
  },
  {
    id: "mentor-farhana-akter",
    name: "Dr. Farhana Akter",
    subject: "Physics & Mathematics",
    qualification: null,
    isFounder: false,
    isDeveloper: false,
    note: "Builds strong concepts with real exam practice.",
    initials: "FA",
    isActive: true,
    photoUrl: null,
    bio: null,
    socialFacebook: null,
    socialInstagram: null,
    socialLinkedin: null,
    socialYoutube: null,
  },
];

type MentorRow = {
  id: string;
  name: string;
  subject: string;
  qualification?: string | null;
  is_founder?: number | boolean;
  is_developer?: number | boolean;
  note: string | null;
  initials: string;
  is_active: number | boolean;
  photo_url?: string | null;
  bio?: string | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_youtube?: string | null;
};

async function ensureMentorsTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS mentors (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        note TEXT NULL,
        initials VARCHAR(8) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        updated_by VARCHAR(191) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    // Older tables may pre-date the extended profile columns.
    try {
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1024) NULL");
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS photo_storage_path VARCHAR(1024) NULL");
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS bio TEXT NULL");
    await query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS qualification VARCHAR(255) NULL",
    );
    await query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_founder TINYINT(1) NOT NULL DEFAULT 0",
    );
    await query(
      "ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_developer TINYINT(1) NOT NULL DEFAULT 0",
    );
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(1024) NULL");
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(1024) NULL");
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS social_linkedin VARCHAR(1024) NULL");
      await query("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS social_youtube VARCHAR(1024) NULL");
    } catch {
      // Best effort — columns may already exist.
    }
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

function mapMentor(row: MentorRow): Mentor {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject ?? "",
    qualification: row.qualification ?? null,
    isFounder: Boolean(row.is_founder),
    isDeveloper: Boolean(row.is_developer),
    note: row.note ?? "",
    initials: row.initials,
    isActive: Boolean(row.is_active),
    photoUrl: row.photo_url ?? null,
    bio: row.bio ?? null,
    socialFacebook: row.social_facebook ?? null,
    socialInstagram: row.social_instagram ?? null,
    socialLinkedin: row.social_linkedin ?? null,
    socialYoutube: row.social_youtube ?? null,
  };
}

/** All mentors (including hidden), ordered — used by the Admin Panel. */
export async function fetchAllMentors(): Promise<Mentor[]> {
  try {
    await ensureMentorsTable();
    const rows = await query<MentorRow[]>(
      `SELECT id, name, subject, note, initials, is_active,
              photo_url, bio, social_facebook, social_instagram, social_linkedin, social_youtube
       FROM mentors ORDER BY sort_order ASC`,
    );
    if (!rows || rows.length === 0) return DEFAULT_MENTORS;
    return rows.map(mapMentor);
  } catch {
    return DEFAULT_MENTORS;
  }
}

/** Active mentors only — used by the live homepage. */
export async function fetchMentors(): Promise<Mentor[]> {
  try {
    await ensureMentorsTable();
    const rows = await query<MentorRow[]>(
      `SELECT id, name, subject, note, initials, is_active,
              photo_url, bio, social_facebook, social_instagram, social_linkedin, social_youtube
       FROM mentors WHERE is_active = 1 ORDER BY sort_order ASC`,
    );
    if (!rows || rows.length === 0) return DEFAULT_MENTORS.filter((m) => m.isActive);
    return rows.map(mapMentor);
  } catch {
    return DEFAULT_MENTORS;
  }
}

export type MentorSaveInput = {
  id?: unknown;
  name?: unknown;
  subject?: unknown;
  note?: unknown;
  initials?: unknown;
  isActive?: unknown;
  bio?: unknown;
  socialFacebook?: unknown;
  socialInstagram?: unknown;
  socialLinkedin?: unknown;
  socialYoutube?: unknown;
};

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeMentorInput(
  raw: Record<string, unknown>,
): MentorSaveInput & { valid: boolean } {
  const name = str(raw.name, 255);
  if (!name) return { valid: false };
  return {
    valid: true,
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 64) : null,
    name,
    subject: str(raw.subject, 255),
    note: str(raw.note, 1000),
    initials:
      str(raw.initials, 8) ||
      name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    isActive: raw.isActive === true || raw.isActive === "true" || raw.isActive === "1",
    bio: typeof raw.bio === "string" ? raw.bio.slice(0, 2000) : undefined,
    socialFacebook: typeof raw.socialFacebook === "string" ? raw.socialFacebook.slice(0, 1024) : undefined,
    socialInstagram: typeof raw.socialInstagram === "string" ? raw.socialInstagram.slice(0, 1024) : undefined,
    socialLinkedin: typeof raw.socialLinkedin === "string" ? raw.socialLinkedin.slice(0, 1024) : undefined,
    socialYoutube: typeof raw.socialYoutube === "string" ? raw.socialYoutube.slice(0, 1024) : undefined,
  };
}

function validateSocial(url: string | null, label: string) {
  if (url && !isValidHttpUrl(url)) {
    throw new Error(`${label} link must be a valid https:// URL.`);
  }
}

export async function saveMentors(
  mentors: Array<Record<string, unknown>>,
  adminUid: string,
): Promise<Mentor[]> {
  await ensureMentorsTable();

  for (const raw of mentors) {
    const entry = normalizeMentorInput(raw);
    if (!entry.valid) {
      throw new Error("Each mentor needs at least a name.");
    }
    validateSocial((entry.socialFacebook as string | undefined) ?? null, "Facebook");
    validateSocial((entry.socialInstagram as string | undefined) ?? null, "Instagram");
    validateSocial((entry.socialLinkedin as string | undefined) ?? null, "LinkedIn");
    validateSocial((entry.socialYoutube as string | undefined) ?? null, "YouTube");
  }

  for (let index = 0; index < mentors.length; index += 1) {
    const entry = normalizeMentorInput(mentors[index]);
    const id =
      typeof entry.id === "string" && entry.id
        ? entry.id
        : `mentor-${Date.now()}-${index}`;
    await query(
      `INSERT INTO mentors (id, name, subject, note, initials, is_active, sort_order, updated_by,
                            bio, social_facebook, social_instagram, social_linkedin, social_youtube)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         subject = VALUES(subject),
         note = VALUES(note),
         initials = VALUES(initials),
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order),
         bio = COALESCE(VALUES(bio), bio),
         social_facebook = COALESCE(VALUES(social_facebook), social_facebook),
         social_instagram = COALESCE(VALUES(social_instagram), social_instagram),
         social_linkedin = COALESCE(VALUES(social_linkedin), social_linkedin),
         social_youtube = COALESCE(VALUES(social_youtube), social_youtube)`,
      [
        id,
        entry.name as string,
        (entry.subject as string) || "",
        (entry.note as string) || null,
        (entry.initials as string) || "?",
        entry.isActive ? 1 : 0,
        index + 1,
        adminUid ?? null,
        (entry.bio as string | undefined) || null,
        (entry.socialFacebook as string | undefined) || null,
        (entry.socialInstagram as string | undefined) || null,
        (entry.socialLinkedin as string | undefined) || null,
        (entry.socialYoutube as string | undefined) || null,
      ],
    );
  }

  return fetchAllMentors();
}

async function deletePhotoFile(storagePath: string | null | undefined): Promise<void> {
  if (typeof storagePath !== "string" || storagePath.length === 0) return;
  if (!storagePath.startsWith(MENTOR_PHOTO_DIR)) return;
  try {
    await removeFile(storagePath);
  } catch {
    // Best-effort cleanup.
  }
}

/** Upload/replace a mentor photo. */
export async function saveMentorPhoto(
  id: string,
  file: File,
): Promise<Mentor[]> {
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  if (!(ALLOWED_MENTOR_PHOTO_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new Error("Unsupported photo type. Use PNG, JPG or WebP.");
  }
  if (file.size > MAX_MENTOR_PHOTO_SIZE) {
    throw new Error("Photo must be 5 MB or smaller.");
  }

  await ensureMentorsTable();

  const previousRows = await query<{ photo_storage_path: string | null }[]>(
    "SELECT photo_storage_path FROM mentors WHERE id = ? LIMIT 1",
    [id],
  );
  const previousPath = previousRows[0]?.photo_storage_path ?? null;

  const fileName = `${id}-${Date.now()}${extension}`;
  const url = await saveFile(
    MENTOR_PHOTO_DIR,
    fileName,
    await file.arrayBuffer(),
  );
  const storagePath = `${MENTOR_PHOTO_DIR}/${fileName}`;

  await query(
    "UPDATE mentors SET photo_url = ?, photo_storage_path = ? WHERE id = ?",
    [url, storagePath, id],
  );

  if (previousPath && previousPath !== storagePath) {
    await deletePhotoFile(previousPath);
  }

  return fetchAllMentors();
}

export async function deleteMentor(id: string): Promise<Mentor[]> {
  await ensureMentorsTable();
  const rows = await query<{ photo_storage_path: string | null }[]>(
    "SELECT photo_storage_path FROM mentors WHERE id = ? LIMIT 1",
    [id],
  );
  await query("DELETE FROM mentors WHERE id = ?", [id]);
  if (rows[0]?.photo_storage_path) {
    await deletePhotoFile(rows[0].photo_storage_path);
  }
  return fetchAllMentors();
}
