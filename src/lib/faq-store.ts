import { exec, query, ensureColumn } from "@/lib/mysql";
import {
  faqs as SEED_FAQS,
  type Faq,
  type FaqAnswerType,
  type FaqStatus,
} from "@/lib/faq";
import { sanitizeFaqHtml } from "@/lib/faq-sanitize";
import { toVideoEmbed } from "@/lib/video-embed";

type FaqRow = {
  id: string;
  question: string;
  answer_type?: FaqAnswerType | null;
  answer: string;
  video_url?: string | null;
  status: FaqStatus;
  is_active?: number | boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
};

const ANSWER_TYPES: FaqAnswerType[] = ["text", "video", "text_video"];

function normalizeAnswerType(value: unknown): FaqAnswerType {
  return ANSWER_TYPES.includes(value as FaqAnswerType)
    ? (value as FaqAnswerType)
    : "text";
}

async function ensureFaqsTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        question VARCHAR(500) NOT NULL,
        answer_type ENUM('text','video','text_video') NOT NULL DEFAULT 'text',
        answer TEXT NOT NULL,
        video_url VARCHAR(1024) NULL,
        status ENUM('published', 'unpublished') NOT NULL DEFAULT 'published',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        updated_by VARCHAR(191) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    // Older deployments — add the new columns when missing.
    try {
      await ensureColumn("faqs", "answer_type", "ENUM('text','video','text_video') NOT NULL DEFAULT 'text' AFTER question");
      await ensureColumn("faqs", "video_url", "VARCHAR(1024) NULL AFTER answer");
      await ensureColumn("faqs", "is_active", "TINYINT(1) NOT NULL DEFAULT 1 AFTER status");
    } catch {
      // Columns already exist.
    }
    // Seed the default FAQs once so the DB is the single source of truth.
    await seedDefaultFaqs();
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

async function seedDefaultFaqs(): Promise<void> {
  const rows = await query<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM faqs",
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;
  for (const faq of SEED_FAQS) {
    await query(
      `INSERT IGNORE INTO faqs (id, question, answer_type, answer, video_url, status, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        faq.id,
        faq.question,
        faq.answerType,
        faq.answer,
        faq.videoUrl,
        faq.status,
        faq.isActive ? 1 : 0,
        faq.order,
      ],
    );
  }
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function rowToFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    videoUrl: row.video_url ?? null,
    answerType: normalizeAnswerType(row.answer_type),
    order: 0,
    status: row.status === "unpublished" ? "unpublished" : "published",
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** All FAQs (including hidden/disabled), ordered — Admin Panel. */
export async function fetchAllFaqs(): Promise<Faq[]> {
  try {
    await ensureFaqsTable();
    const rows = await query<FaqRow[]>(
      `SELECT id, question, answer_type, answer, video_url, status, is_active,
              created_at, updated_at
       FROM faqs ORDER BY sort_order ASC`,
    );
    return rows.map(rowToFaq);
  } catch {
    // Table not migrated yet — fall back to the seeded defaults.
    return SEED_FAQS.map((faq) => ({ ...faq }));
  }
}

/**
 * Published AND enabled FAQs only, ordered by display order — the live
 * homepage. 100% database-driven; an empty table renders no FAQ section.
 */
export async function fetchPublishedFaqs(): Promise<Faq[]> {
  try {
    await ensureFaqsTable();
    const rows = await query<FaqRow[]>(
      `SELECT id, question, answer_type, answer, video_url, status, is_active,
              created_at, updated_at
       FROM faqs WHERE status = 'published' AND is_active = 1
       ORDER BY sort_order ASC`,
    );
    return rows.map(rowToFaq);
  } catch {
    return [];
  }
}

export type FaqSaveInput = {
  id?: unknown;
  question?: unknown;
  answer?: unknown;
  videoUrl?: unknown;
  answerType?: unknown;
  status?: unknown;
  isActive?: unknown;
};

function normalizeFaqInput(
  item: FaqSaveInput,
): { valid: boolean; value: Faq } {
  const question =
    typeof item.question === "string" ? item.question.trim() : "";
  const rawAnswer = typeof item.answer === "string" ? item.answer.trim() : "";
  const answerType = normalizeAnswerType(item.answerType);
  const rawVideo =
    typeof item.videoUrl === "string" ? item.videoUrl.trim() : "";

  // Video is required only when the type includes it; text only when it
  // includes text. Sanitise rich-text HTML server-side on every save.
  const needsText = answerType !== "video";
  const needsVideo = answerType !== "text";
  const embed = needsVideo ? toVideoEmbed(rawVideo) : null;

  let videoUrl: string | null = null;
  if (needsVideo) {
    if (!embed) return { valid: false, value: null as never };
    videoUrl = embed.embedUrl;
  }

  if (
    question.length === 0 ||
    question.length > 500 ||
    (needsText && rawAnswer.length === 0)
  ) {
    return { valid: false, value: null as never };
  }

  const status: FaqStatus =
    item.status === "unpublished" || item.status === "published"
      ? item.status
      : "published";

  return {
    valid: true,
    value: {
      id: typeof item.id === "string" && item.id ? item.id.slice(0, 64) : "",
      question,
      answer: sanitizeFaqHtml(rawAnswer),
      videoUrl,
      answerType,
      order: 0,
      status,
      isActive: item.isActive !== false && item.isActive !== "false" && item.isActive !== 0,
    },
  };
}

/** Replace the full FAQ list (add / edit / delete / toggle / reorder). */
export async function saveFaqs(
  items: Array<Record<string, unknown>>,
  adminUid: string,
): Promise<Faq[]> {
  await ensureFaqsTable();

  const normalized: Faq[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const entry = normalizeFaqInput(items[index] as FaqSaveInput);
    if (!entry.valid) {
      throw new Error(
        "Each FAQ needs a question, a matching answer (text and/or a supported video URL), and a valid status.",
      );
    }
    normalized.push({
      ...entry.value,
      id:
        entry.value.id ||
        `faq-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    });
  }

  for (let index = 0; index < normalized.length; index += 1) {
    const faq = normalized[index];
    await query(
      `INSERT INTO faqs (id, question, answer_type, answer, video_url, status, is_active, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         question = VALUES(question),
         answer_type = VALUES(answer_type),
         answer = VALUES(answer),
         video_url = VALUES(video_url),
         status = VALUES(status),
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order),
         updated_by = VALUES(updated_by)`,
      [
        faq.id,
        faq.question,
        faq.answerType,
        faq.answer,
        faq.videoUrl,
        faq.status,
        faq.isActive ? 1 : 0,
        index + 1,
        adminUid ?? null,
      ],
    );
  }

  // Delete rows that are no longer in the list.
  if (normalized.length > 0) {
    const placeholders = normalized.map(() => "?").join(", ");
    await exec(
      `DELETE FROM faqs WHERE id NOT IN (${placeholders})`,
      normalized.map((faq) => faq.id),
    );
  } else {
    await exec("DELETE FROM faqs");
  }

  return fetchAllFaqs();
}
