import { exec, query, parseJsonColumn } from "@/lib/mysql";

export type PdfMaterialHeader = {
  title: string;
  subject: string;
  chapter: string;
  batch: string;
  institution: string;
  headerEnabled: boolean;
  showPageNumbers: boolean;
};

export type PdfMaterialImage = {
  dataUrl: string; // base64 data URL (no OCR, PDF-only)
  name?: string;
  widthPercent?: number; // 30-100, default 100 (column width)
};

export type PdfMaterialQuestion = {
  id: string;
  qNumber: number;
  question: string;
  options: [string, string, string, string];
  answer: string; // "A"|"B"|"C"|"D" or "ক"|"খ"|"গ"|"ঘ" or "" if not set
  needsReview: boolean;
  issues: string[];
  image?: PdfMaterialImage | null;
  isStandaloneImage?: boolean; // true if block is image-only between questions
};

export type PdfMaterialPayload = {
  header: PdfMaterialHeader;
  questions: PdfMaterialQuestion[];
};

export type PdfMaterial = {
  id: number;
  title: string;
  subject: string | null;
  chapter: string | null;
  batch: string | null;
  institution: string | null;
  headerEnabled: boolean;
  showPageNumbers: boolean;
  payload: PdfMaterialPayload;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type PdfMaterialRow = {
  id: number;
  title: string;
  subject: string | null;
  chapter: string | null;
  batch: string | null;
  institution: string | null;
  header_enabled: number | boolean;
  show_page_numbers: number | boolean;
  payload: unknown;
  is_active: number | boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

async function ensurePdfMaterialsTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS pdf_materials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NULL,
      chapter VARCHAR(255) NULL,
      batch VARCHAR(255) NULL,
      institution VARCHAR(255) NULL,
      header_enabled TINYINT(1) NOT NULL DEFAULT 1,
      show_page_numbers TINYINT(1) NOT NULL DEFAULT 1,
      payload JSON NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_by VARCHAR(128) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pdf_materials_active (is_active),
      INDEX idx_pdf_materials_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

function asString(v: unknown, max = 255): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function mapRow(row: PdfMaterialRow): PdfMaterial {
  const payload =
    (parseJsonColumn<PdfMaterialPayload>(row.payload) as PdfMaterialPayload) ?? {
      header: {
        title: row.title,
        subject: row.subject ?? "",
        chapter: row.chapter ?? "",
        batch: row.batch ?? "",
        institution: row.institution ?? "",
        headerEnabled: Boolean(row.header_enabled),
        showPageNumbers: Boolean(row.show_page_numbers),
      },
      questions: [],
    };
  return {
    id: Number(row.id),
    title: row.title,
    subject: row.subject,
    chapter: row.chapter,
    batch: row.batch,
    institution: row.institution,
    headerEnabled: Boolean(row.header_enabled),
    showPageNumbers: Boolean(row.show_page_numbers),
    payload,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    createdBy: row.created_by,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function fetchPdfMaterials(): Promise<PdfMaterial[]> {
  await ensurePdfMaterialsTable();
  const rows = await query<PdfMaterialRow[]>(
    `SELECT id, title, subject, chapter, batch, institution, header_enabled, show_page_numbers, payload, is_active, sort_order, created_by, created_at, updated_at
     FROM pdf_materials WHERE is_active = 1 ORDER BY updated_at DESC, id DESC`,
  );
  return rows.map(mapRow);
}

export async function fetchPdfMaterialById(id: number): Promise<PdfMaterial | null> {
  await ensurePdfMaterialsTable();
  const rows = await query<PdfMaterialRow[]>(
    `SELECT id, title, subject, chapter, batch, institution, header_enabled, show_page_numbers, payload, is_active, sort_order, created_by, created_at, updated_at
     FROM pdf_materials WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function savePdfMaterial(
  input: Record<string, unknown>,
  createdBy?: string | null,
): Promise<PdfMaterial> {
  await ensurePdfMaterialsTable();
  const title = asString(input.title) || asString((input.payload as Record<string, unknown> | undefined)?.title) || "Untitled Material";
  const subject = asString(input.subject, 500) || asString((input.header as Record<string, unknown> | undefined)?.subject) || "";
  const chapter = asString(input.chapter, 500) || "";
  const batch = asString(input.batch, 500) || "";
  const institution = asString(input.institution, 500) || "";
  const headerEnabled = input.headerEnabled !== false && (input.header_enabled as unknown) !== 0;
  const showPageNumbers = input.showPageNumbers !== false && (input.show_page_numbers as unknown) !== 0;
  // payload is the source of truth
  let payload: PdfMaterialPayload;
  if (input.payload && typeof input.payload === "object") {
    payload = input.payload as PdfMaterialPayload;
    // ensure header sync
    if (!payload.header) {
      payload.header = {
        title,
        subject: subject || "",
        chapter: chapter || "",
        batch: batch || "",
        institution: institution || "",
        headerEnabled,
        showPageNumbers,
      };
    }
  } else {
    // fallback from flat fields
    const header = (input.header as PdfMaterialHeader | undefined) ?? {
      title,
      subject: subject || "",
      chapter: chapter || "",
      batch: batch || "",
      institution: institution || "",
      headerEnabled,
      showPageNumbers,
    };
    const questions = (input.questions as PdfMaterialQuestion[] | undefined) ?? [];
    payload = { header, questions };
  }
  // normalize header title to top title
  if (payload.header?.title) payload.header.title = payload.header.title.trim().slice(0, 255);
  // ensure payload questions have ids and numbers (preserve image for manual insertion)
  payload.questions = (payload.questions ?? []).map((q, idx) => ({
    id: q.id || `q-${Date.now()}-${idx}`,
    qNumber: q.qNumber || idx + 1,
    question: q.question || "",
    options: q.options ?? ["", "", "", ""],
    answer: q.answer ?? "",
    needsReview: Boolean(q.needsReview),
    issues: q.issues ?? [],
    image: (q as unknown as { image?: unknown }).image ?? null,
    isStandaloneImage: Boolean((q as unknown as { isStandaloneImage?: unknown }).isStandaloneImage),
  })) as PdfMaterialQuestion[];

  const payloadJson = JSON.stringify(payload);
  const headerTitle = payload.header.title || title;
  const headerSubject = payload.header.subject || subject;
  const headerChapter = payload.header.chapter || chapter;
  const headerBatch = payload.header.batch || batch;
  const headerInstitution = payload.header.institution || institution;
  const hEnabled = payload.header.headerEnabled !== false ? 1 : 0;
  const sPageNum = payload.header.showPageNumbers !== false ? 1 : 0;

  const id = input.id !== undefined && input.id !== null && input.id !== "" ? Number(input.id) : null;
  if (id && Number.isFinite(id)) {
    await exec(
      `UPDATE pdf_materials SET title=?, subject=?, chapter=?, batch=?, institution=?, header_enabled=?, show_page_numbers=?, payload=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [headerTitle, headerSubject || null, headerChapter || null, headerBatch || null, headerInstitution || null, hEnabled, sPageNum, payloadJson, id],
    );
    const found = await fetchPdfMaterialById(id);
    if (!found) throw new Error("Failed to save material.");
    return found;
  }
  const res = await exec(
    `INSERT INTO pdf_materials (title, subject, chapter, batch, institution, header_enabled, show_page_numbers, payload, created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
    [headerTitle, headerSubject || null, headerChapter || null, headerBatch || null, headerInstitution || null, hEnabled, sPageNum, payloadJson, createdBy ?? null],
  );
  const newId = Number((res as unknown as { insertId: number }).insertId);
  const found = await fetchPdfMaterialById(newId);
  if (!found) throw new Error("Failed to create material.");
  return found;
}

export async function deletePdfMaterial(id: number): Promise<void> {
  await ensurePdfMaterialsTable();
  await exec(`UPDATE pdf_materials SET is_active=0 WHERE id=?`, [id]);
  // alternatively hard delete: await exec(`DELETE FROM pdf_materials WHERE id=?`,[id]);
}

export async function reorderPdfMaterials(orderedIds: number[]): Promise<PdfMaterial[]> {
  await ensurePdfMaterialsTable();
  for (let i = 0; i < orderedIds.length; i++) {
    await exec(`UPDATE pdf_materials SET sort_order=? WHERE id=?`, [i + 1, orderedIds[i]]);
  }
  return fetchPdfMaterials();
}
