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
      text: "You will get the full exam duration. A countdown timer starts as soon as you begin.",
    },
    {
      title: "Marking System",
      text: "Every correct answer earns the full marks of that question. Unanswered questions score zero.",
    },
    {
      title: "Negative Marking",
      text: "If negative marking is enabled for this exam, each wrong answer deducts 0.25 marks. Answer carefully!",
    },
    {
      title: "Answer Selection Rules",
      text: "Select ONE option per question. An answer is locked immediately after selection — you cannot change or clear it, and you cannot go back to a previous question.",
    },
    {
      title: "Submission Rules",
      text: "Click Submit Exam when you finish (or reach the last question). Your result is calculated and shown instantly after submission.",
    },
    {
      title: "Auto-Submit Rules",
      text: "When the timer reaches zero the exam auto-submits your locked answers. If the exam is interrupted (tab closed / page left), everything already answered is auto-submitted too. Starting the exam on another device ends this session and submits it automatically.",
    },
    {
      title: "Second Attempt Timer Penalty",
      text: "If enabled for this exam, repeating this same exam as a second-timer deducts extra marks after grading. First attempts are never penalised.",
    },
    {
      title: "Answer Key",
      text: "Correct answers stay hidden during the exam. After submission you can open the answer script from your result card to compare your answers with the correct ones.",
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
