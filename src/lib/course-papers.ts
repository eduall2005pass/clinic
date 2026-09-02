import { exec, query, ensureColumn } from "@/lib/mysql";

// ── Papers (১ম / ২য় পত্র) & Materials — Admin-managed content ────────────
// Papers sit between a subject and its chapters (course_chapters.paper_id).
// Materials are PDFs/slides/notes attached to a chapter. Everything here is
// controlled from Admin Panel → Courses → Papers & Materials.

export type Paper = {
  id: string;
  subjectId: string;
  name: string;
  kind: "paper" | "segment";
  isActive: boolean;
};

export type CourseMaterialItem = {
  id: number;
  chapterId: string;
  title: string;
  materialType: "slide" | "pdf" | "note" | "link" | "other";
  fileUrl: string;
};

type PaperRow = {
  id: string;
  subject_id: string;
  name: string;
  kind: string;
  is_active: number | boolean;
};

type MaterialRow = {
  id: number;
  chapter_id: string;
  title: string;
  material_type: string;
  file_url: string;
};

async function ensurePaperTables(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS course_papers (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      subject_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      kind ENUM('paper','segment') NOT NULL DEFAULT 'paper',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  await exec(
    `CREATE TABLE IF NOT EXISTS course_materials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      chapter_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      material_type ENUM('slide','pdf','note','link','other') NOT NULL DEFAULT 'pdf',
      file_url VARCHAR(1024) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  try {
    await ensureColumn("course_chapters", "paper_id", "VARCHAR(64) NULL AFTER subject_id");
  } catch {
    // Column may already exist.
  }
}

const MATERIAL_TYPES = ["slide", "pdf", "note", "link", "other"] as const;
type MaterialType = (typeof MATERIAL_TYPES)[number];

function asMaterialType(value: unknown): MaterialType {
  const raw = typeof value === "string" ? value.toLowerCase() : "";
  return (MATERIAL_TYPES as readonly string[]).includes(raw)
    ? (raw as MaterialType)
    : "pdf";
}

function asString(value: unknown, max = 255): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** All papers of one subject (or every paper), ordered. */
export async function fetchPapers(subjectId?: string): Promise<Paper[]> {
  await ensurePaperTables();
  const rows = subjectId
    ? await query<PaperRow[]>(
        `SELECT id, subject_id, name, kind, is_active FROM course_papers
          WHERE subject_id = ? ORDER BY sort_order ASC`,
        [subjectId],
      )
    : await query<PaperRow[]>(
        `SELECT id, subject_id, name, kind, is_active FROM course_papers
          ORDER BY sort_order ASC`,
      );
  return rows.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    kind: row.kind === "segment" ? "segment" : "paper",
    isActive: Boolean(row.is_active),
  }));
}

export async function savePaper(
  input: Record<string, unknown>,
): Promise<Paper[]> {
  await ensurePaperTables();
  const name = asString(input.name);
  const subjectId = asString(input.subjectId);
  if (!name) throw new Error("Paper name is required.");
  if (!subjectId) throw new Error("A subject must be selected.");
  const id = asString(input.id, 64) || `paper-${Date.now()}`;
  await exec(
    `INSERT INTO course_papers (id, subject_id, name, kind, is_active)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE subject_id = VALUES(subject_id), name = VALUES(name),
       kind = VALUES(kind), is_active = VALUES(is_active)`,
    [
      id,
      subjectId,
      name,
      input.kind === "segment" ? "segment" : "paper",
      input.isActive === false ? 0 : 1,
    ],
  );
  return fetchPapers(subjectId);
}

export async function updatePaper(
  id: string,
  patch: { name?: string; isActive?: boolean },
): Promise<Paper[]> {
  await ensurePaperTables();
  if (patch.name !== undefined) {
    const name = asString(patch.name);
    if (!name) throw new Error("Paper name is required.");
    await exec(`UPDATE course_papers SET name = ? WHERE id = ?`, [name, id]);
  }
  if (patch.isActive !== undefined) {
    await exec(`UPDATE course_papers SET is_active = ? WHERE id = ?`, [
      patch.isActive ? 1 : 0,
      id,
    ]);
  }
  const rows = await query<{ subject_id: string }[]>(
    `SELECT subject_id FROM course_papers WHERE id = ? LIMIT 1`,
    [id],
  );
  return fetchPapers(rows[0]?.subject_id);
}

/** Reorder papers from an ordered id list. */
export async function reorderPapers(orderedIds: string[]): Promise<Paper[]> {
  await ensurePaperTables();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec(`UPDATE course_papers SET sort_order = ? WHERE id = ?`, [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchPapers();
}

/** Delete a paper; its chapters fall back to the subject's General group. */
export async function deletePaper(id: string): Promise<Paper[]> {
  await ensurePaperTables();
  const rows = await query<{ subject_id: string }[]>(
    `SELECT subject_id FROM course_papers WHERE id = ? LIMIT 1`,
    [id],
  );
  await exec(`UPDATE course_chapters SET paper_id = NULL WHERE paper_id = ?`, [id]);
  await exec(`DELETE FROM course_papers WHERE id = ?`, [id]);
  return fetchPapers(rows[0]?.subject_id);
}

/** Assign a chapter to a paper (or NULL to remove it from any paper). */
export async function setChapterPaper(
  chapterId: string,
  paperId: string | null,
): Promise<void> {
  await ensurePaperTables();
  await exec(`UPDATE course_chapters SET paper_id = ? WHERE id = ?`, [
    paperId && paperId.trim() ? paperId.trim().slice(0, 64) : null,
    chapterId,
  ]);
}

/** Chapters of one subject with their current paper assignment. */
export async function fetchSubjectChaptersWithPapers(
  subjectId: string,
): Promise<{ id: string; name: string; paperId: string | null; isActive: boolean }[]> {
  await ensurePaperTables();
  const rows = await query<{
    id: string;
    name: string;
    paper_id: string | null;
    is_active: number | boolean;
  }[]>(
    `SELECT id, name, paper_id, is_active FROM course_chapters
      WHERE subject_id = ? ORDER BY sort_order ASC`,
    [subjectId],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    paperId: row.paper_id ?? null,
    isActive: Boolean(row.is_active),
  }));
}

/** Materials under one chapter (or all), ordered. */
export async function fetchMaterials(
  chapterId?: string,
): Promise<CourseMaterialItem[]> {
  await ensurePaperTables();
  const rows = chapterId
    ? await query<MaterialRow[]>(
        `SELECT id, chapter_id, title, material_type, file_url FROM course_materials
          WHERE chapter_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
        [chapterId],
      )
    : await query<MaterialRow[]>(
        `SELECT id, chapter_id, title, material_type, file_url FROM course_materials
          WHERE is_active = 1 ORDER BY sort_order ASC`,
      );
  return rows.map((row) => ({
    id: Number(row.id),
    chapterId: row.chapter_id,
    title: row.title,
    materialType: asMaterialType(row.material_type),
    fileUrl: row.file_url,
  }));
}

export async function saveMaterial(
  input: Record<string, unknown>,
): Promise<CourseMaterialItem[]> {
  await ensurePaperTables();
  const title = asString(input.title);
  const chapterId = asString(input.chapterId, 64);
  const fileUrl = asString(input.fileUrl, 1024);
  if (!title) throw new Error("Material title is required.");
  if (!chapterId) throw new Error("A chapter must be selected.");
  if (!fileUrl) throw new Error("Material file/URL is required.");
  if (input.id !== undefined && input.id !== null && input.id !== "") {
    await exec(
      `UPDATE course_materials SET title = ?, material_type = ?, file_url = ?, chapter_id = ?
       WHERE id = ?`,
      [
        title,
        asMaterialType(input.materialType),
        fileUrl,
        chapterId,
        Number(input.id),
      ],
    );
    return fetchMaterials(chapterId);
  }
  await exec(
    `INSERT INTO course_materials (chapter_id, title, material_type, file_url)
     VALUES (?, ?, ?, ?)`,
    [chapterId, title, asMaterialType(input.materialType), fileUrl],
  );
  return fetchMaterials(chapterId);
}

export async function deleteMaterial(id: number): Promise<void> {
  await ensurePaperTables();
  await exec(`DELETE FROM course_materials WHERE id = ?`, [id]);
}

/** Change display order of materials from an ordered id list. */
export async function reorderMaterials(orderedIds: number[]): Promise<ReturnType<typeof fetchMaterials>> {
  await ensurePaperTables();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec(`UPDATE course_materials SET sort_order = ? WHERE id = ?`, [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchMaterials();
}
