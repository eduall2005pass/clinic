import { query, exec, isMysqlConfigured } from "@/lib/mysql";

/**
 * MySQL-backed homepage info cards:
 *  - section "why"     → Why MediSpark benefit cards
 *  - section "success" → Our Success statistic cards
 * Admin manages them from Admin → Home Control (+ Add Card); the Main
 * Website homepage renders whatever is active here.
 */

export const HOME_CARD_SECTIONS = ["why", "success"] as const;

export type HomeCardSection = (typeof HOME_CARD_SECTIONS)[number];

export const WHY_ICONS = [
  "book",
  "exam",
  "chat",
  "chart",
  "video",
  "mentor",
] as const;

export const SUCCESS_ICONS = [
  "graduation",
  "exam",
  "users",
  "target",
  "trophy",
  "chart",
] as const;

export type HomeCard = {
  key: string;
  section: HomeCardSection;
  title: string;
  description: string;
  value: string | null;
  icon: string;
  order: number;
  isActive: boolean;
};

const SEED_WHY_CARDS: Array<Omit<HomeCard, "key" | "section" | "isActive">> = [
  {
    title: "Structured Courses",
    description:
      "Chapter-based lessons across HSC subjects and the medical admission syllabus.",
    value: null,
    icon: "book",
    order: 1,
  },
  {
    title: "Exam-Ready Practice",
    description:
      "Model tests and chapter-wise exams to build real exam confidence.",
    value: null,
    icon: "exam",
    order: 2,
  },
  {
    title: "Expert Q&A",
    description:
      "Ask questions and get clear answers from mentors and fellow students.",
    value: null,
    icon: "chat",
    order: 3,
  },
  {
    title: "Track Your Progress",
    description:
      "Monitor your preparation and stay on top of your study goals.",
    value: null,
    icon: "chart",
    order: 4,
  },
  {
    title: "Recorded Video Classes",
    description:
      "Watch classes anytime and revise every topic at your own pace.",
    value: null,
    icon: "video",
    order: 5,
  },
  {
    title: "Mentor Support",
    description:
      "Guidance from experienced mentors at every step of your journey.",
    value: null,
    icon: "mentor",
    order: 6,
  },
];

const SEED_SUCCESS_CARDS: Array<
  Omit<HomeCard, "key" | "section" | "isActive">
> = [
  {
    title: "Students Guided",
    description: "Students preparing for HSC and medical admission.",
    value: "500+",
    icon: "users",
    order: 1,
  },
  {
    title: "Model Exams",
    description: "Chapter-wise and full model tests across all subjects.",
    value: "40+",
    icon: "exam",
    order: 2,
  },
  {
    title: "Answered Questions",
    description: "Questions resolved by mentors in the Q&A section.",
    value: "200+",
    icon: "graduation",
    order: 3,
  },
  {
    title: "Success Rate",
    description: "Students reporting improved exam preparation.",
    value: "90%",
    icon: "trophy",
    order: 4,
  },
];

type CardRow = {
  card_key: string;
  section: string;
  title: string;
  description: string;
  value: string | null;
  icon: string;
  sort_order: number;
  is_active: number;
};

function mapCard(row: CardRow): HomeCard {
  return {
    key: row.card_key,
    section: row.section === "success" ? "success" : "why",
    title: row.title,
    description: row.description,
    value: row.value ?? null,
    icon: row.icon,
    order: Number(row.sort_order) || 0,
    isActive: row.is_active === 1,
  };
}

async function ensureTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS home_cards (
      card_key VARCHAR(64) NOT NULL,
      section VARCHAR(16) NOT NULL DEFAULT 'why',
      title VARCHAR(120) NOT NULL,
      description VARCHAR(255) NOT NULL DEFAULT '',
      value VARCHAR(64) NULL,
      icon VARCHAR(32) NOT NULL DEFAULT 'book',
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uq_home_cards_pk (card_key),
      KEY idx_home_cards_section (section)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

/** Create the table + seed the approved default cards once. */
export async function ensureHomeCards(): Promise<void> {
  await ensureTable();
  const rows = await query<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM home_cards",
  );
  if ((rows[0]?.total ?? 0) > 0) return;
  for (const card of SEED_WHY_CARDS) {
    await exec(
      `INSERT IGNORE INTO home_cards
        (card_key, section, title, description, value, icon, sort_order, is_active)
       VALUES (?, 'why', ?, ?, ?, ?, ?, 1)`,
      [slugify(card.title), card.title, card.description, card.value, card.icon, card.order],
    );
  }
  for (const card of SEED_SUCCESS_CARDS) {
    await exec(
      `INSERT IGNORE INTO home_cards
        (card_key, section, title, description, value, icon, sort_order, is_active)
       VALUES (?, 'success', ?, ?, ?, ?, ?, 1)`,
      [slugify(card.title), card.title, card.description, card.value, card.icon, card.order],
    );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Cards for one section; activeOnly for the website render. */
export async function fetchHomeCards(
  section: HomeCardSection,
  activeOnly = false,
): Promise<HomeCard[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureHomeCards();
    const rows = await query<CardRow[]>(
      `SELECT card_key, section, title, description, value, icon, sort_order, is_active
       FROM home_cards WHERE section = ? ${activeOnly ? "AND is_active = 1" : ""}
       ORDER BY sort_order ASC, title ASC`,
      [section],
    );
    return rows.map(mapCard);
  } catch {
    return [];
  }
}

export type HomeCardInput = {
  section: HomeCardSection;
  title: string;
  description?: string;
  value?: string | null;
  icon?: string;
};

/** Add a new card to a section. */
export async function addHomeCard(input: HomeCardInput): Promise<void> {
  await ensureHomeCards();
  const existing = await fetchHomeCards(input.section);
  const base = slugify(input.title) || `card-${Date.now().toString(36)}`;
  let key = base;
  let suffix = 2;
  while (existing.some((card) => card.key === key)) {
    key = `${base}-${suffix++}`;
  }
  const maxOrder = existing.reduce((max, card) => Math.max(max, card.order), 0);
  await exec(
    `INSERT INTO home_cards
      (card_key, section, title, description, value, icon, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      key,
      input.section,
      input.title,
      input.description?.trim() || "",
      input.value?.trim() || null,
      input.icon ?? "book",
      maxOrder + 1,
    ],
  );
}

export async function updateHomeCard(
  key: string,
  updates: Partial<{
    title: string;
    description: string;
    value: string | null;
    icon: string;
    order: number;
    isActive: boolean;
  }>,
): Promise<boolean> {
  await ensureHomeCards();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (updates.title !== undefined) {
    sets.push("title = ?");
    params.push(updates.title);
  }
  if (updates.description !== undefined) {
    sets.push("description = ?");
    params.push(updates.description);
  }
  if (updates.value !== undefined) {
    sets.push("value = ?");
    params.push(updates.value && updates.value.trim() ? updates.value.trim() : null);
  }
  if (updates.icon !== undefined) {
    sets.push("icon = ?");
    params.push(updates.icon);
  }
  if (updates.order !== undefined) {
    sets.push("sort_order = ?");
    params.push(updates.order);
  }
  if (updates.isActive !== undefined) {
    sets.push("is_active = ?");
    params.push(updates.isActive ? 1 : 0);
  }
  if (sets.length === 0) return false;
  params.push(key);
  const result = await exec(
    `UPDATE home_cards SET ${sets.join(", ")} WHERE card_key = ?`,
    params,
  );
  return result.affectedRows > 0;
}

export async function deleteHomeCard(key: string): Promise<boolean> {
  await ensureHomeCards();
  const result = await exec("DELETE FROM home_cards WHERE card_key = ?", [key]);
  return result.affectedRows > 0;
}
