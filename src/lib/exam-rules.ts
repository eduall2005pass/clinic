import { exec, query } from "@/lib/mysql";

/**
 * Admin-managed exam rules (Admin → Public Exam Control → Category → Exam →
 * Rules). Every rule belongs to one specific exam_id — rules are never
 * shared between exams. New public exams are seeded with MediSpark's
 * standard rule set; admins can add / edit / delete / reorder afterwards.
 */

export type ExamRule = {
  id: number | null;
  examId: string;
  title: string;
  text: string;
  sortOrder: number;
};

type ExamRuleRow = {
  id: number;
  exam_id: string;
  rule_title: string | null;
  rule_text: string;
  sort_order: number;
};

let rulesTableReady: Promise<void> | null = null;
function ensureExamRulesTable(): Promise<void> {
  if (!rulesTableReady) {
    rulesTableReady = (async () => {
      await exec(
        `CREATE TABLE IF NOT EXISTS exam_rules (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          exam_id VARCHAR(64) NOT NULL,
          rule_title VARCHAR(191) NOT NULL DEFAULT '',
          rule_text TEXT NOT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          KEY exam_rules_exam_idx (exam_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    })().catch((error) => {
      rulesTableReady = null;
      throw error;
    });
  }
  return rulesTableReady;
}

function rowToRule(row: ExamRuleRow): ExamRule {
  return {
    id: row.id,
    examId: row.exam_id,
    title: row.rule_title ?? "",
    text: row.rule_text,
    sortOrder: row.sort_order ?? 0,
  };
}

/** All rules of ONE exam, ordered. Strictly scoped by exam_id. */
export async function fetchExamRules(examId: string): Promise<ExamRule[]> {
  try {
    await ensureExamRulesTable();
    const rows = await query<ExamRuleRow[]>(
      `SELECT id, exam_id, rule_title, rule_text, sort_order
       FROM exam_rules WHERE exam_id = ? ORDER BY sort_order ASC, id ASC`,
      [examId],
    );
    return rows.map(rowToRule);
  } catch {
    return [];
  }
}

export async function saveExamRule(input: Record<string, unknown>): Promise<ExamRule[]> {
  await ensureExamRulesTable();
  const examId = typeof input.examId === "string" ? input.examId.trim() : "";
  if (!/^[a-z0-9-]{2,64}$/.test(examId)) {
    throw new Error("A valid exam is required.");
  }
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 191) : "";
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) throw new Error("Rule text is required.");

  const existingId = Number(input.id);
  if (Number.isInteger(existingId) && existingId > 0) {
    // Rule must stay inside its own exam — never move across exams.
    await exec(
      `UPDATE exam_rules SET rule_title = ?, rule_text = ? WHERE id = ? AND exam_id = ?`,
      [title, text, existingId, examId],
    );
    return fetchExamRules(examId);
  }

  const maxRows = await query<{ m: number | null }[]>(
    `SELECT MAX(sort_order) AS m FROM exam_rules WHERE exam_id = ?`,
    [examId],
  );
  const nextOrder = (maxRows[0]?.m ?? 0) + 1;
  await exec(
    `INSERT INTO exam_rules (exam_id, rule_title, rule_text, sort_order)
     VALUES (?, ?, ?, ?)`,
    [examId, title, text, nextOrder],
  );
  return fetchExamRules(examId);
}

export async function deleteExamRule(
  examId: string,
  id: number,
): Promise<ExamRule[]> {
  await ensureExamRulesTable();
  await exec(`DELETE FROM exam_rules WHERE id = ? AND exam_id = ?`, [id, examId]);
  return fetchExamRules(examId);
}

/** Reorder rules within ONE exam from an ordered id list. */
export async function reorderExamRules(
  examId: string,
  orderedIds: number[],
): Promise<ExamRule[]> {
  await ensureExamRulesTable();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec(
      `UPDATE exam_rules SET sort_order = ? WHERE id = ? AND exam_id = ?`,
      [index + 1, orderedIds[index], examId],
    );
  }
  return fetchExamRules(examId);
}

/** MediSpark's standard rule set for brand-new exams (editable afterwards). */
export function buildDefaultExamRules(examId: string): ExamRule[] {
  const defaults: Array<Pick<ExamRule, "title" | "text">> = [
    {
      title: "Duration",
      text: "আপনি পরীক্ষার পুরো সময় পাবেন। পরীক্ষা শুরু করার সাথে সাথেই কাউন্টডাউন টাইমার চালু হবে।",
    },
    {
      title: "Marking System",
      text: "প্রতিটি সঠিক উত্তরের জন্য প্রশ্নের পুরো নম্বর পাবেন। উত্তর না দিলে শূন্য নম্বর পাবেন।",
    },
    {
      title: "Negative Marking",
      text: "এই পরীক্ষায় নেগেটিভ মার্কিং চালু থাকলে প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা যাবে। সতর্কভাবে উত্তর দিন!",
    },
    {
      title: "Answer Selection Rules",
      text: "প্রতিটি প্রশ্নের জন্য একটি অপশন নির্বাচন করুন। উত্তর নির্বাচন করার সাথে সাথেই তা লক হয়ে যাবে — পরিবর্তন বা মুছে ফেলা যাবে না। আপনি যেকোনো ক্রমে প্রশ্নের উত্তর দিতে পারবেন এবং জমা দেওয়ার আগে বাদ পড়া প্রশ্নে ফিরে যেতে পারবেন।",
    },
    {
      title: "Submission Rules",
      text: "একটি স্ক্রলযোগ্য প্রশ্নপত্রে সব প্রশ্নের উত্তর দিন, তারপর Submit Exam এ ক্লিক করুন। জমা দেওয়ার সাথে সাথেই আপনার ফলাফল হিসাব করে দেখানো হবে।",
    },
    {
      title: "Auto-Submit Rules",
      text: "টাইমার শূন্যে পৌঁছালে পরীক্ষা স্বয়ংক্রিয়ভাবে আপনার লক করা উত্তরগুলো জমা দিয়ে দেবে। যদি পরীক্ষা চলাকালীন ট্যাব বন্ধ করেন বা পেজ ছেড়ে যান, তাহলে ইতিমধ্যে দেওয়া উত্তরগুলোও স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে। অন্য ডিভাইসে একই পরীক্ষা শুরু করলে এই সেশনটি শেষ হয়ে স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।",
    },
    {
      title: "Second Attempt Timer Penalty",
      text: "এই পরীক্ষার জন্য চালু থাকলে, একই পরীক্ষা দ্বিতীয়বার (Second Timer) দিলে গ্রেডিংয়ের পর অতিরিক্ত নম্বর কাটা যাবে। প্রথমবারের (First Timer) প্রচেষ্টায় কখনো জরিমানা করা হয় না।",
    },
    {
      title: "Answer Key",
      text: "পরীক্ষা চলাকালীন সঠিক উত্তরগুলো লুকানো থাকবে। জমা দেওয়ার পর আপনি রেজাল্ট কার্ড থেকে উত্তরপত্র খুলে আপনার উত্তরগুলো সঠিক উত্তরের সাথে মিলিয়ে দেখতে পারবেন।",
    },
  ];
  return defaults.map((rule, index) => ({
    id: null,
    examId,
    title: rule.title,
    text: rule.text,
    sortOrder: index + 1,
  }));
}

/** Seed the standard rules for a new exam (only when it has none yet). */
export async function seedDefaultExamRules(examId: string): Promise<void> {
  await ensureExamRulesTable();
  const existing = await query<{ id: number }[]>(
    `SELECT id FROM exam_rules WHERE exam_id = ? LIMIT 1`,
    [examId],
  );
  if (existing.length > 0) return;
  const rules = buildDefaultExamRules(examId);
  for (const rule of rules) {
    await exec(
      `INSERT INTO exam_rules (exam_id, rule_title, rule_text, sort_order)
       VALUES (?, ?, ?, ?)`,
      [rule.examId, rule.title, rule.text, rule.sortOrder],
    );
  }
}
