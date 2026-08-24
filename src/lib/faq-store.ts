import { exec, query } from "@/lib/mysql";
import { faqs as DEFAULT_FAQS, type Faq, type FaqStatus } from "@/lib/faq";

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  status: FaqStatus;
};

async function ensureFaqsTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        question VARCHAR(500) NOT NULL,
        answer TEXT NOT NULL,
        status ENUM('published', 'unpublished') NOT NULL DEFAULT 'published',
        sort_order INT NOT NULL DEFAULT 0,
        updated_by VARCHAR(191) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

function rowToFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    order: 0,
    status: row.status === "unpublished" ? "unpublished" : "published",
  };
}

/** All FAQs (including hidden), ordered — used by the Admin Panel. */
export async function fetchAllFaqs(): Promise<Faq[]> {
  try {
    await ensureFaqsTable();
    const rows = await query<FaqRow[]>(
      `SELECT id, question, answer, status
       FROM faqs ORDER BY sort_order ASC`,
    );
    if (!rows || rows.length === 0) return [...DEFAULT_FAQS].sort((a, b) => a.order - b.order);
    return rows.map(rowToFaq);
  } catch {
    // Table not migrated yet — fall back to current static behaviour.
    return getPublishedDefaultFaqs();
  }
}

/** Published FAQs only, ordered — used by the live homepage. */
export async function fetchPublishedFaqs(): Promise<Faq[]> {
  try {
    await ensureFaqsTable();
    const rows = await query<FaqRow[]>(
      `SELECT id, question, answer, status
       FROM faqs WHERE status = 'published' ORDER BY sort_order ASC`,
    );
    // Empty table → show the default four FAQs instead of an empty section.
    return rows.length > 0 ? rows.map(rowToFaq) : getPublishedDefaultFaqs();
  } catch {
    return getPublishedDefaultFaqs();
  }
}

function getPublishedDefaultFaqs(): Faq[] {
  return DEFAULT_FAQS.filter((faq) => faq.status === "published").sort(
    (a, b) => a.order - b.order,
  );
}

export type FaqSaveInput = {
  id?: unknown;
  question?: unknown;
  answer?: unknown;
  status?: unknown;
};

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeFaqInput(
  raw: Record<string, unknown>,
): { valid: true; value: Faq } | { valid: false } {
  const question = str(raw.question, 500);
  const answer = str(raw.answer, 5000);
  if (!question || !answer) return { valid: false };
  const status: FaqStatus =
    raw.status === "unpublished" || raw.status === "false" || raw.status === "0"
      ? "unpublished"
      : "published";
  return {
    valid: true,
    value: {
      id:
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id.trim().slice(0, 64)
          : "",
      question,
      answer,
      order: 0,
      status,
    },
  };
}

/**
 * Replace the full FAQ list (handles add / edit / delete / enable-disable /
 * reorder in one shot). Rows missing from the list are removed.
 */
export async function saveFaqs(
  items: Array<Record<string, unknown>>,
  adminUid: string,
): Promise<Faq[]> {
  await ensureFaqsTable();

  const normalized: Faq[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const entry = normalizeFaqInput(items[index]);
    if (!entry.valid) {
      throw new Error("Each FAQ needs a question and an answer.");
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
      `INSERT INTO faqs (id, question, answer, status, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         question = VALUES(question),
         answer = VALUES(answer),
         status = VALUES(status),
         sort_order = VALUES(sort_order),
         updated_by = VALUES(updated_by)`,
      [faq.id, faq.question, faq.answer, faq.status, index + 1, adminUid ?? null],
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
