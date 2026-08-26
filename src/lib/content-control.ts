import { exec, query } from "@/lib/mysql";

export const DEFAULT_TYPES = [
  { type_key: "class", name: "Class" },
  { type_key: "exam", name: "Exam" },
  { type_key: "materials", name: "Materials" },
  { type_key: "archive", name: "Archive" },
] as const;

export type CtypeScope = {
  courseSlug: string;
  subjectId?: string | null;
  paperId?: string | null;
};

async function ensureTables() {
  await query("SELECT 1 FROM course_content_types LIMIT 1");
}

export async function ensureTypes(scope: CtypeScope): Promise<
  Array<{ typeKey: string; name: string }>
> {
  await ensureTables();
  const existing = await query<{ type_key: string; name: string }[]>(
    `SELECT type_key, name FROM course_content_types
      WHERE course_slug = ? AND subject_id <=> ? AND paper_id <=> ?
      ORDER BY sort_order ASC`,
    [scope.courseSlug, scope.subjectId ?? "", scope.paperId ?? ""],
  );
  if (existing.length > 0) return existing.map((r) => ({ typeKey: r.type_key, name: r.name }));
  let order = 1;
  for (const t of DEFAULT_TYPES) {
    await exec(
      `INSERT IGNORE INTO course_content_types
         (course_slug, subject_id, paper_id, type_key, name, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [scope.courseSlug, scope.subjectId ?? "", scope.paperId ?? "", t.type_key, t.name, order++],
    );
  }
  return DEFAULT_TYPES.map((t) => ({ typeKey: t.type_key, name: t.name }));
}

/** Chapters of one content-type scope (subject/paper scoped or course-level). */
export async function getTypeChapters(
  scope: CtypeScope,
  contentType: string,
): Promise<Array<{ id: string; name: string; classCount?: number }>> {
  await ensureTables();
  return query(
    `SELECT ch.id, ch.name,
            (SELECT COUNT(*) FROM course_classes cl WHERE cl.chapter_id = ch.id AND cl.is_active=1) AS classCount
       FROM course_chapters ch
      WHERE COALESCE(ch.course_slug,'') = ?
        AND COALESCE(ch.subject_id,'') = ?
        AND COALESCE(ch.paper_id,'') = ?
        AND ch.content_type = ?
        AND ch.is_active = 1
      ORDER BY ch.sort_order, ch.name`,
    [scope.courseSlug, scope.subjectId ?? "", scope.paperId ?? "", contentType],
  ) as never;
}

export async function addTypeChapter(
  scope: CtypeScope,
  contentType: string,
  name: string,
  id: string,
): Promise<void> {
  const rows = await query<{ next: number }[]>(
    "SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM course_chapters WHERE course_slug = ?",
    [scope.courseSlug],
  );
  await exec(
    `INSERT INTO course_chapters (id, subject_id, paper_id, course_slug, name, content_type, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, scope.subjectId ?? "", scope.paperId ?? "", scope.courseSlug, name, contentType, Number(rows[0]?.next ?? 1)],
  );
}

export async function updateTypeChapter(id: string, name: string, sortOrder: number): Promise<boolean> {
  const res = await exec(
    "UPDATE course_chapters SET name = ?, sort_order = ? WHERE id = ?",
    [name, sortOrder, id],
  );
  return res.affectedRows > 0;
}

export async function deleteTypeChapter(id: string): Promise<void> {
  await exec("UPDATE course_chapters SET is_active = 0 WHERE id = ?", [id]);
}
