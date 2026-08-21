import { query } from "@/lib/mysql";

export type Mentor = {
  id: string;
  name: string;
  subject: string;
  note: string;
  initials: string;
  isActive: boolean;
};

export const DEFAULT_MENTORS: Mentor[] = [
  {
    id: "mentor-anika-rahman",
    name: "Dr. Anika Rahman",
    subject: "Biology & Anatomy",
    note: "Makes complex biology topics simple and exam-focused.",
    initials: "AR",
    isActive: true,
  },
  {
    id: "mentor-shafiqul-islam",
    name: "Prof. Shafiqul Islam",
    subject: "Chemistry",
    note: "Guides students through every chapter with clarity.",
    initials: "SI",
    isActive: true,
  },
  {
    id: "mentor-farhana-akter",
    name: "Dr. Farhana Akter",
    subject: "Physics & Mathematics",
    note: "Builds strong concepts with real exam practice.",
    initials: "FA",
    isActive: true,
  },
];

type MentorRow = {
  id: string;
  name: string;
  subject: string;
  note: string | null;
  initials: string;
  is_active: number | boolean;
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
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

export async function fetchMentors(): Promise<Mentor[]> {
  try {
    await ensureMentorsTable();
    const rows = await query<MentorRow[]>(
      `SELECT id, name, subject, note, initials, is_active
       FROM mentors ORDER BY sort_order ASC`,
    );
    if (!rows || rows.length === 0) return DEFAULT_MENTORS;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      subject: row.subject,
      note: row.note ?? "",
      initials: row.initials,
      isActive: Boolean(row.is_active),
    }));
  } catch {
    // Table not migrated yet — fall back to current static behaviour.
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
};

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
  };
}

export async function saveMentors(
  mentors: Array<Record<string, unknown>>,
  adminUid: string,
): Promise<Mentor[]> {
  await ensureMentorsTable();

  const normalized: Mentor[] = [];
  for (let index = 0; index < mentors.length; index += 1) {
    const entry = normalizeMentorInput(mentors[index]);
    if (!entry.valid) {
      throw new Error("Each mentor needs at least a name.");
    }
    normalized.push({
      id:
        typeof entry.id === "string" && entry.id
          ? entry.id
          : `mentor-${Date.now()}-${index}`,
      name: entry.name as string,
      subject: (entry.subject as string) || "",
      note: (entry.note as string) || "",
      initials: (entry.initials as string) || "?",
      isActive: entry.isActive as boolean,
    });
  }

  for (let index = 0; index < normalized.length; index += 1) {
    const mentor = normalized[index];
    await query(
      `INSERT INTO mentors (id, name, subject, note, initials, is_active, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         subject = VALUES(subject),
         note = VALUES(note),
         initials = VALUES(initials),
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order)`,
      [
        mentor.id,
        mentor.name,
        mentor.subject,
        mentor.note || null,
        mentor.initials,
        mentor.isActive ? 1 : 0,
        index + 1,
        adminUid ?? null,
      ],
    );
  }

  return fetchMentors();
}
