import { query, exec } from "@/lib/mysql";

export type QaAskCardSettings = {
  title: string;
  subtitle: string;
  placeholder: string;
  submitLabel: string;
  cancelLabel: string;
  showImageUpload: boolean;
  guidelineText: string;
  updatedAt: number | null;
  updatedBy: string | null;
};

export const DEFAULT_QA_ASK_CARD_SETTINGS: QaAskCardSettings = {
  title: "Ask a Question",
  subtitle: "Select your category, enrolled course and subject, then write your question clearly.",
  placeholder: "Type your question here...",
  submitLabel: "Submit Question",
  cancelLabel: "Cancel",
  showImageUpload: true,
  guidelineText: "Be specific — mention the chapter, topic or exam you are asking about.",
  updatedAt: null,
  updatedBy: null,
};

const ASK_CARD_ID = "active";

type AskCardRow = {
  title: string;
  subtitle: string | null;
  placeholder: string | null;
  submit_label: string;
  cancel_label: string;
  show_image_upload: number | boolean;
  guideline_text: string | null;
  updated_at: Date | string;
  updated_by: string | null;
};

async function ensureTable(): Promise<void> {
  try {
    await exec(
      `CREATE TABLE IF NOT EXISTS qa_ask_card_settings (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        title VARCHAR(255) NOT NULL DEFAULT 'Ask a Question',
        subtitle TEXT NULL,
        placeholder VARCHAR(1024) NULL,
        submit_label VARCHAR(255) NOT NULL DEFAULT 'Submit Question',
        cancel_label VARCHAR(255) NOT NULL DEFAULT 'Cancel',
        show_image_upload TINYINT(1) NOT NULL DEFAULT 1,
        guideline_text TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(191) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  } catch {
    // best-effort
  }
}

function rowToSettings(row: AskCardRow): QaAskCardSettings {
  return {
    title: row.title || DEFAULT_QA_ASK_CARD_SETTINGS.title,
    subtitle: row.subtitle ?? DEFAULT_QA_ASK_CARD_SETTINGS.subtitle,
    placeholder: row.placeholder ?? DEFAULT_QA_ASK_CARD_SETTINGS.placeholder,
    submitLabel: row.submit_label || DEFAULT_QA_ASK_CARD_SETTINGS.submitLabel,
    cancelLabel: row.cancel_label || DEFAULT_QA_ASK_CARD_SETTINGS.cancelLabel,
    showImageUpload: Boolean(row.show_image_upload),
    guidelineText: row.guideline_text ?? DEFAULT_QA_ASK_CARD_SETTINGS.guidelineText,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
    updatedBy: row.updated_by ?? null,
  };
}

export async function fetchQaAskCardSettings(): Promise<QaAskCardSettings> {
  try {
    await ensureTable();
    const rows = await query<AskCardRow[]>(
      `SELECT title, subtitle, placeholder, submit_label, cancel_label, show_image_upload, guideline_text, updated_at, updated_by
       FROM qa_ask_card_settings WHERE id = ? LIMIT 1`,
      [ASK_CARD_ID],
    );
    if (!rows || rows.length === 0) return DEFAULT_QA_ASK_CARD_SETTINGS;
    return rowToSettings(rows[0]);
  } catch {
    return DEFAULT_QA_ASK_CARD_SETTINGS;
  }
}

export async function saveQaAskCardSettings(
  input: Partial<QaAskCardSettings>,
  adminUid: string,
): Promise<QaAskCardSettings> {
  await ensureTable();
  const current = await fetchQaAskCardSettings();
  const next = {
    title: input.title !== undefined ? input.title.trim().slice(0, 255) || current.title : current.title,
    subtitle: input.subtitle !== undefined ? input.subtitle.trim().slice(0, 1024) : current.subtitle,
    placeholder: input.placeholder !== undefined ? input.placeholder.trim().slice(0, 1024) : current.placeholder,
    submitLabel: input.submitLabel !== undefined ? input.submitLabel.trim().slice(0, 255) || current.submitLabel : current.submitLabel,
    cancelLabel: input.cancelLabel !== undefined ? input.cancelLabel.trim().slice(0, 255) || current.cancelLabel : current.cancelLabel,
    showImageUpload: input.showImageUpload !== undefined ? input.showImageUpload : current.showImageUpload,
    guidelineText: input.guidelineText !== undefined ? input.guidelineText.trim().slice(0, 1024) : current.guidelineText,
  };

  await exec(
    `INSERT INTO qa_ask_card_settings (id, title, subtitle, placeholder, submit_label, cancel_label, show_image_upload, guideline_text, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       subtitle = VALUES(subtitle),
       placeholder = VALUES(placeholder),
       submit_label = VALUES(submit_label),
       cancel_label = VALUES(cancel_label),
       show_image_upload = VALUES(show_image_upload),
       guideline_text = VALUES(guideline_text),
       updated_by = VALUES(updated_by)`,
    [
      ASK_CARD_ID,
      next.title,
      next.subtitle || null,
      next.placeholder || null,
      next.submitLabel,
      next.cancelLabel,
      next.showImageUpload ? 1 : 0,
      next.guidelineText || null,
      adminUid,
    ],
  );
  return fetchQaAskCardSettings();
}
