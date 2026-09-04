import { exec, query, ensureColumn } from "@/lib/mysql";

// Flow 4: Course → Subject → Chapter → Content (legacy) + Course Content → Subject → Content (NEW spec)
// Single source of truth for both Admin and Student.
// Courses are from catalog_courses (Course Control). This module manages the
// hierarchy below it.
// - Legacy path: Course → Subject → Chapter → Content (via chapter_contents)
// - NEW path (spec): Course Content → Subject → Content (via subject_contents) — no Chapter layer
// Both coexist; student routing branches by course content_layout = flow-4 uses the NEW direct path.

export type Flow4Subject = { id: string; name: string; sortOrder: number };
export type Flow4Chapter = { id: string; subjectId: string; name: string; sortOrder: number };
export type Flow4Content = {
  id: string;
  chapterId: string;
  title: string;
  contentType: string;
  videoUrl: string | null;
  fileUrl: string | null;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
};

export type Flow4DirectContent = {
  id: string;
  courseSlug: string;
  subjectId: string;
  title: string;
  contentType: string;
  videoUrl: string | null;
  fileUrl: string | null;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
};

let ensured = false;
async function ensureSchema(): Promise<void> {
  if (ensured) return;
  // Ensure course_chapters has course_slug for isolation
  try {
    await ensureColumn("course_chapters", "course_slug", "`course_slug` VARCHAR(191) NULL");
  } catch {}
  try {
    await ensureColumn("course_chapters", "content_type", "`content_type` VARCHAR(24) NOT NULL DEFAULT 'class'");
  } catch {}
  await exec(`CREATE TABLE IF NOT EXISTS course_subject_assignments (
    subject_id VARCHAR(64) NOT NULL,
    course_slug VARCHAR(191) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (subject_id, course_slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  try {
    await ensureColumn("course_subject_assignments", "sort_order", "`sort_order` INT NOT NULL DEFAULT 0");
  } catch {}
  await exec(`CREATE TABLE IF NOT EXISTS chapter_contents (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    chapter_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type ENUM('class','note','pdf','slide','link','exam','other') NOT NULL DEFAULT 'class',
    video_url VARCHAR(1024) NULL,
    file_url VARCHAR(1024) NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_chapter_contents_chapter (chapter_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  try {
    await exec(`CREATE TABLE IF NOT EXISTS course_chapters (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      subject_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } catch {}
  // NEW: Flow 4 Direct — Course Content → Subject → Content (no Chapter)
  await exec(`CREATE TABLE IF NOT EXISTS subject_contents (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    course_slug VARCHAR(191) NOT NULL,
    subject_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type ENUM('class','note','pdf','slide','link','exam','other','video','image','audio','quiz') NOT NULL DEFAULT 'class',
    video_url VARCHAR(1024) NULL,
    file_url VARCHAR(1024) NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_subject_contents_course (course_slug),
    KEY idx_subject_contents_subject (subject_id),
    KEY idx_subject_contents_sort (subject_id, sort_order),
    KEY idx_subject_contents_cs (course_slug, subject_id),
    KEY idx_subject_contents_active (course_slug, subject_id, is_active, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Ensure content_type supports new types (video,image,audio,quiz)
  try {
    await exec(`ALTER TABLE subject_contents MODIFY COLUMN content_type ENUM('class','note','pdf','slide','link','exam','other','video','image','audio','quiz') NOT NULL DEFAULT 'class'`);
  } catch {}
  // Also widen chapter_contents to support same types for consistency
  try {
    await exec(`ALTER TABLE chapter_contents MODIFY COLUMN content_type ENUM('class','note','pdf','slide','link','exam','other','video','image','audio','quiz') NOT NULL DEFAULT 'class'`);
  } catch {}
  ensured = true;
}

// ── Helpers ──
function toStr(v: unknown): string { return typeof v === "string" ? v.trim() : ""; }

// ── Subjects (per course) ──
export async function getFlow4Subjects(courseSlug: string): Promise<Flow4Subject[]> {
  await ensureSchema();
  const rows = await query<Array<{ id: string; name: string; sort_order: number }>>(
    `SELECT s.id, s.name, COALESCE(a.sort_order, s.sort_order, 0) AS sort_order
       FROM course_subjects s
       JOIN course_subject_assignments a ON a.subject_id = s.id
      WHERE a.course_slug = ? AND s.is_active = 1
      ORDER BY COALESCE(a.sort_order, 0) ASC, s.sort_order ASC, s.name ASC`,
    [courseSlug],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: Number(r.sort_order ?? 0) }));
}

export async function addFlow4Subject(courseSlug: string, name: string): Promise<Flow4Subject> {
  await ensureSchema();
  const clean = toStr(name);
  if (clean.length < 2) throw new Error("Subject name is required.");
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  // Create subject
  await exec(`INSERT INTO course_subjects (id, name, is_active, sort_order) VALUES (?, ?, 1, 0)`, [id, clean]);
  // Assign to course with next sort_order
  const nxt = await query<Array<{ nxt: number }>>(
    `SELECT COALESCE(MAX(sort_order),0)+1 AS nxt FROM course_subject_assignments WHERE course_slug = ?`,
    [courseSlug],
  );
  await exec(`INSERT INTO course_subject_assignments (subject_id, course_slug, sort_order) VALUES (?, ?, ?)`, [
    id, courseSlug, Number(nxt[0]?.nxt ?? 1),
  ]);
  return { id, name: clean, sortOrder: Number(nxt[0]?.nxt ?? 1) };
}

export async function updateFlow4Subject(id: string, name: string): Promise<void> {
  await ensureSchema();
  const clean = toStr(name);
  if (!clean) throw new Error("Subject name is required.");
  await exec(`UPDATE course_subjects SET name = ? WHERE id = ?`, [clean, id]);
}

export async function deleteFlow4Subject(courseSlug: string, subjectId: string): Promise<void> {
  await ensureSchema();
  // Remove assignment; keep subject row if used by other courses, else deactivate
  await exec(`DELETE FROM course_subject_assignments WHERE subject_id = ? AND course_slug = ?`, [subjectId, courseSlug]);
  // Always deactivate direct contents for this course+subject
  try { await exec(`UPDATE subject_contents SET is_active = 0 WHERE course_slug = ? AND subject_id = ?`, [courseSlug, subjectId]); } catch {}
  const remaining = await query<Array<{ cnt: number }>>(`SELECT COUNT(*) AS cnt FROM course_subject_assignments WHERE subject_id = ?`, [subjectId]);
  if (Number(remaining[0]?.cnt ?? 0) === 0) {
    // Soft-delete subject and its chapters + any remaining direct contents
    await exec(`UPDATE course_subjects SET is_active = 0 WHERE id = ?`, [subjectId]);
    await exec(`UPDATE course_chapters SET is_active = 0 WHERE subject_id = ?`, [subjectId]);
    try { await exec(`UPDATE subject_contents SET is_active = 0 WHERE subject_id = ?`, [subjectId]); } catch {}
  }
}

export async function reorderFlow4Subjects(courseSlug: string, orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await exec(`UPDATE course_subject_assignments SET sort_order = ? WHERE subject_id = ? AND course_slug = ?`, [i + 1, orderedIds[i], courseSlug]);
  }
}

// ── Direct Contents (per subject + course) — NEW Flow 4 spec: Course Content → Subject → Content ──
export async function getFlow4DirectContents(courseSlug: string, subjectId: string): Promise<Flow4DirectContent[]> {
  await ensureSchema();
  const rows = await query<Array<{ id: string; course_slug: string; subject_id: string; title: string; content_type: string; video_url: string | null; file_url: string | null; duration_minutes: number; sort_order: number; is_active: number }>>(
    `SELECT id, course_slug, subject_id, title, content_type, video_url, file_url, duration_minutes, sort_order, is_active
       FROM subject_contents WHERE course_slug = ? AND subject_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC`,
    [courseSlug, subjectId],
  );
  return rows.map((r) => ({
    id: r.id,
    courseSlug: r.course_slug,
    subjectId: r.subject_id,
    title: r.title,
    contentType: r.content_type,
    videoUrl: r.video_url,
    fileUrl: r.file_url,
    durationMinutes: Number(r.duration_minutes ?? 0),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
  }));
}

export async function addFlow4DirectContent(input: {
  courseSlug: string;
  subjectId: string;
  title: string;
  contentType?: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
  durationMinutes?: number;
}): Promise<Flow4DirectContent> {
  await ensureSchema();
  const title = toStr(input.title);
  if (title.length < 1) throw new Error("Content title is required.");
  if (!input.courseSlug || !input.subjectId) throw new Error("Course and Subject are required.");
  let ct = toStr(input.contentType).toLowerCase() || "class";
  const allowed = ["class", "note", "pdf", "slide", "link", "exam", "other", "video", "image", "audio", "quiz"];
  if (!allowed.includes(ct)) ct = "class";
  const rows = await query<Array<{ nxt: number }>>(
    `SELECT COALESCE(MAX(sort_order),0)+1 AS nxt FROM subject_contents WHERE course_slug = ? AND subject_id = ?`,
    [input.courseSlug, input.subjectId],
  );
  const id = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await exec(
    `INSERT INTO subject_contents (id, course_slug, subject_id, title, content_type, video_url, file_url, duration_minutes, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, input.courseSlug, input.subjectId, title, ct, input.videoUrl ? toStr(input.videoUrl) || null : null, input.fileUrl ? toStr(input.fileUrl) || null : null, Math.max(0, Number(input.durationMinutes) || 0), Number(rows[0]?.nxt ?? 1)],
  );
  return {
    id,
    courseSlug: input.courseSlug,
    subjectId: input.subjectId,
    title,
    contentType: ct,
    videoUrl: input.videoUrl ?? null,
    fileUrl: input.fileUrl ?? null,
    durationMinutes: Math.max(0, Number(input.durationMinutes) || 0),
    sortOrder: Number(rows[0]?.nxt ?? 1),
    isActive: true,
  };
}

export async function updateFlow4DirectContent(id: string, patch: { title?: string; contentType?: string; videoUrl?: string | null; fileUrl?: string | null; durationMinutes?: number }): Promise<void> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) {
    const t = toStr(patch.title);
    if (!t) throw new Error("Content title is required.");
    sets.push("title = ?");
    vals.push(t);
  }
  if (patch.contentType !== undefined) {
    let ct = toStr(patch.contentType).toLowerCase();
    const allowed = ["class", "note", "pdf", "slide", "link", "exam", "other", "video", "image", "audio", "quiz"];
    if (!allowed.includes(ct)) ct = "class";
    sets.push("content_type = ?");
    vals.push(ct);
  }
  if (patch.videoUrl !== undefined) {
    sets.push("video_url = ?");
    vals.push(patch.videoUrl ? toStr(patch.videoUrl) || null : null);
  }
  if (patch.fileUrl !== undefined) {
    sets.push("file_url = ?");
    vals.push(patch.fileUrl ? toStr(patch.fileUrl) || null : null);
  }
  if (patch.durationMinutes !== undefined) {
    sets.push("duration_minutes = ?");
    vals.push(Math.max(0, Number(patch.durationMinutes) || 0));
  }
  if (sets.length === 0) return;
  vals.push(id);
  await exec(`UPDATE subject_contents SET ${sets.join(", ")} WHERE id = ?`, vals);
}

export async function deleteFlow4DirectContent(id: string): Promise<void> {
  await ensureSchema();
  await exec(`UPDATE subject_contents SET is_active = 0 WHERE id = ?`, [id]);
}

export async function reorderFlow4DirectContents(courseSlug: string, subjectId: string, orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await exec(`UPDATE subject_contents SET sort_order = ? WHERE id = ? AND course_slug = ? AND subject_id = ?`, [i + 1, orderedIds[i], courseSlug, subjectId]);
  }
}

export async function getFlow4DirectCourseData(courseSlug: string): Promise<{
  subjects: Array<{ id: string; name: string; sortOrder: number; contents: Flow4DirectContent[] }>;
}> {
  await ensureSchema();
  const subjects = await getFlow4Subjects(courseSlug);
  const result: Array<{ id: string; name: string; sortOrder: number; contents: Flow4DirectContent[] }> = [];
  for (const sub of subjects) {
    const contents = await getFlow4DirectContents(courseSlug, sub.id);
    result.push({ id: sub.id, name: sub.name, sortOrder: sub.sortOrder, contents });
  }
  return { subjects: result };
}

// ── Chapters (per subject + course) ──
export async function getFlow4Chapters(courseSlug: string, subjectId: string): Promise<Flow4Chapter[]> {
  await ensureSchema();
  const rows = await query<Array<{ id: string; subject_id: string; name: string; sort_order: number }>>(
    `SELECT id, subject_id, name, sort_order FROM course_chapters
      WHERE subject_id = ? AND is_active = 1 AND (COALESCE(course_slug,'') = ? OR COALESCE(course_slug,'') = '')
      ORDER BY sort_order ASC, name ASC`,
    [subjectId, courseSlug],
  );
  // Filter to only this course's chapters when course_slug is set
  // Keep legacy empty course_slug but ensure subject matches
  return rows
    .filter((r) => {
      // If we stored course_slug, already filtered; legacy rows included
      return true;
    })
    .map((r) => ({ id: r.id, subjectId: r.subject_id, name: r.name, sortOrder: Number(r.sort_order ?? 0) }));
}

export async function addFlow4Chapter(courseSlug: string, subjectId: string, name: string): Promise<Flow4Chapter> {
  await ensureSchema();
  const clean = toStr(name);
  if (clean.length < 1) throw new Error("Chapter name is required.");
  const rows = await query<Array<{ nxt: number }>>(
    `SELECT COALESCE(MAX(sort_order),0)+1 AS nxt FROM course_chapters WHERE subject_id = ?`,
    [subjectId],
  );
  const id = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await exec(
    `INSERT INTO course_chapters (id, subject_id, course_slug, name, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [id, subjectId, courseSlug, clean, Number(rows[0]?.nxt ?? 1)],
  );
  return { id, subjectId, name: clean, sortOrder: Number(rows[0]?.nxt ?? 1) };
}

export async function updateFlow4Chapter(id: string, name: string): Promise<void> {
  await ensureSchema();
  const clean = toStr(name);
  if (!clean) throw new Error("Chapter name is required.");
  await exec(`UPDATE course_chapters SET name = ? WHERE id = ?`, [clean, id]);
}

export async function deleteFlow4Chapter(id: string): Promise<void> {
  await ensureSchema();
  await exec(`UPDATE course_chapters SET is_active = 0 WHERE id = ?`, [id]);
  await exec(`UPDATE chapter_contents SET is_active = 0 WHERE chapter_id = ?`, [id]);
  // Also hide legacy classes/materials for cleanliness
  try { await exec(`UPDATE course_classes SET is_active = 0 WHERE chapter_id = ?`, [id]); } catch {}
  try { await exec(`UPDATE course_materials SET is_active = 0 WHERE chapter_id = ?`, [id]); } catch {}
}

export async function reorderFlow4Chapters(subjectId: string, orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await exec(`UPDATE course_chapters SET sort_order = ? WHERE id = ? AND subject_id = ?`, [i + 1, orderedIds[i], subjectId]);
  }
}

// ── Contents (per chapter) ──
export async function getFlow4Contents(chapterId: string): Promise<Flow4Content[]> {
  await ensureSchema();
  // New unified contents
  const unified = await query<Array<{ id: string; chapter_id: string; title: string; content_type: string; video_url: string | null; file_url: string | null; duration_minutes: number; sort_order: number; is_active: number }>>(
    `SELECT id, chapter_id, title, content_type, video_url, file_url, duration_minutes, sort_order, is_active
       FROM chapter_contents WHERE chapter_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at ASC`,
    [chapterId],
  );
  if (unified.length > 0) {
    return unified.map((r) => ({
      id: r.id,
      chapterId: r.chapter_id,
      title: r.title,
      contentType: r.content_type,
      videoUrl: r.video_url,
      fileUrl: r.file_url,
      durationMinutes: Number(r.duration_minutes ?? 0),
      sortOrder: Number(r.sort_order ?? 0),
      isActive: Boolean(r.is_active),
    }));
  }
  // Fallback: legacy course_classes + course_materials merged as content
  let legacy: Flow4Content[] = [];
  try {
    const classes = await query<Array<{ id: string; chapter_id: string; title: string; video_url: string | null; note_url: string | null; duration_minutes: number; sort_order: number }>>(
      `SELECT id, chapter_id, title, video_url, note_url, duration_minutes, sort_order FROM course_classes WHERE chapter_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
      [chapterId],
    );
    legacy.push(
      ...classes.map((c) => ({
        id: c.id,
        chapterId: c.chapter_id,
        title: c.title,
        contentType: "class",
        videoUrl: c.video_url,
        fileUrl: c.note_url,
        durationMinutes: Number(c.duration_minutes ?? 0),
        sortOrder: Number(c.sort_order ?? 0),
        isActive: true,
      })),
    );
  } catch {}
  try {
    const mats = await query<Array<{ id: number; chapter_id: string; title: string; file_url: string; material_type: string; sort_order: number }>>(
      `SELECT id, chapter_id, title, file_url, material_type, sort_order FROM course_materials WHERE chapter_id = ? AND is_active = 1 ORDER BY sort_order ASC`,
      [chapterId],
    );
    legacy.push(
      ...mats.map((m) => ({
        id: String(m.id),
        chapterId: m.chapter_id,
        title: m.title,
        contentType: m.material_type ?? "pdf",
        videoUrl: null,
        fileUrl: m.file_url,
        durationMinutes: 0,
        sortOrder: Number(m.sort_order ?? 0) + 1000,
        isActive: true,
      })),
    );
  } catch {}
  try {
    const exams = await query<Array<{ id: string; chapter_id: string; title: string; duration_minutes: number; sort_order: number }>>(
      `SELECT id, chapter_id, title, duration_minutes, sort_order FROM exams WHERE chapter_id = ? AND status='published' ORDER BY sort_order ASC`,
      [chapterId],
    );
    legacy.push(
      ...exams.map((e) => ({
        id: e.id,
        chapterId: e.chapter_id,
        title: e.title,
        contentType: "exam",
        videoUrl: null,
        fileUrl: null,
        durationMinutes: Number(e.duration_minutes ?? 0),
        sortOrder: Number(e.sort_order ?? 0) + 2000,
        isActive: true,
      })),
    );
  } catch {}
  // Sort merged by sortOrder
  legacy.sort((a, b) => a.sortOrder - b.sortOrder);
  return legacy;
}

export async function addFlow4Content(input: {
  chapterId: string;
  title: string;
  contentType?: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
  durationMinutes?: number;
}): Promise<Flow4Content> {
  await ensureSchema();
  const title = toStr(input.title);
  if (title.length < 1) throw new Error("Content title is required.");
  let ct = toStr(input.contentType).toLowerCase() || "class";
  const allowed = ["class", "note", "pdf", "slide", "link", "exam", "other", "video", "image", "audio", "quiz"];
  if (!allowed.includes(ct)) ct = "class";
  const rows = await query<Array<{ nxt: number }>>(
    `SELECT COALESCE(MAX(sort_order),0)+1 AS nxt FROM chapter_contents WHERE chapter_id = ?`,
    [input.chapterId],
  );
  const id = `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await exec(
    `INSERT INTO chapter_contents (id, chapter_id, title, content_type, video_url, file_url, duration_minutes, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, input.chapterId, title, ct, input.videoUrl ? toStr(input.videoUrl) || null : null, input.fileUrl ? toStr(input.fileUrl) || null : null, Math.max(0, Number(input.durationMinutes) || 0), Number(rows[0]?.nxt ?? 1)],
  );
  return {
    id,
    chapterId: input.chapterId,
    title,
    contentType: ct,
    videoUrl: input.videoUrl ?? null,
    fileUrl: input.fileUrl ?? null,
    durationMinutes: Math.max(0, Number(input.durationMinutes) || 0),
    sortOrder: Number(rows[0]?.nxt ?? 1),
    isActive: true,
  };
}

export async function updateFlow4Content(id: string, patch: { title?: string; contentType?: string; videoUrl?: string | null; fileUrl?: string | null; durationMinutes?: number }): Promise<void> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) {
    const t = toStr(patch.title);
    if (!t) throw new Error("Content title is required.");
    sets.push("title = ?");
    vals.push(t);
  }
  if (patch.contentType !== undefined) {
    let ct = toStr(patch.contentType).toLowerCase();
    const allowed = ["class", "note", "pdf", "slide", "link", "exam", "other", "video", "image", "audio", "quiz"];
    if (!allowed.includes(ct)) ct = "class";
    sets.push("content_type = ?");
    vals.push(ct);
  }
  if (patch.videoUrl !== undefined) {
    sets.push("video_url = ?");
    vals.push(patch.videoUrl ? toStr(patch.videoUrl) || null : null);
  }
  if (patch.fileUrl !== undefined) {
    sets.push("file_url = ?");
    vals.push(patch.fileUrl ? toStr(patch.fileUrl) || null : null);
  }
  if (patch.durationMinutes !== undefined) {
    sets.push("duration_minutes = ?");
    vals.push(Math.max(0, Number(patch.durationMinutes) || 0));
  }
  if (sets.length === 0) return;
  vals.push(id);
  await exec(`UPDATE chapter_contents SET ${sets.join(", ")} WHERE id = ?`, vals);
  // Also try to update legacy tables if id matches legacy format
  if (patch.title !== undefined) {
    try { await exec(`UPDATE course_classes SET title = ? WHERE id = ?`, [toStr(patch.title), id]); } catch {}
    try { await exec(`UPDATE course_materials SET title = ? WHERE id = ?`, [toStr(patch.title), id]); } catch {}
  }
}

export async function deleteFlow4Content(id: string): Promise<void> {
  await ensureSchema();
  await exec(`UPDATE chapter_contents SET is_active = 0 WHERE id = ?`, [id]);
  try { await exec(`UPDATE course_classes SET is_active = 0 WHERE id = ?`, [id]); } catch {}
  try { await exec(`UPDATE course_materials SET is_active = 0 WHERE id = ?`, [String(id)]); } catch {}
}

export async function reorderFlow4Contents(chapterId: string, orderedIds: string[]): Promise<void> {
  await ensureSchema();
  for (let i = 0; i < orderedIds.length; i++) {
    await exec(`UPDATE chapter_contents SET sort_order = ? WHERE id = ? AND chapter_id = ?`, [i + 1, orderedIds[i], chapterId]);
    try { await exec(`UPDATE course_classes SET sort_order = ? WHERE id = ? AND chapter_id = ?`, [i + 1, orderedIds[i], chapterId]); } catch {}
    try { await exec(`UPDATE course_materials SET sort_order = ? WHERE id = ? AND chapter_id = ?`, [i + 1, orderedIds[i], chapterId]); } catch {}
  }
}

// ── Flow4 student data (enrollment-gated) ──
export async function getFlow4CourseData(courseSlug: string): Promise<{
  subjects: Array<{ id: string; name: string; sortOrder: number; chapters: Array<{ id: string; name: string; sortOrder: number; contents: Flow4Content[] }> }>;
}> {
  await ensureSchema();
  const subjects = await getFlow4Subjects(courseSlug);
  const result: Array<{ id: string; name: string; sortOrder: number; chapters: Array<{ id: string; name: string; sortOrder: number; contents: Flow4Content[] }> }> = [];
  for (const sub of subjects) {
    const chapters = await getFlow4Chapters(courseSlug, sub.id);
    const chWithContents: Array<{ id: string; name: string; sortOrder: number; contents: Flow4Content[] }> = [];
    for (const ch of chapters) {
      const contents = await getFlow4Contents(ch.id);
      chWithContents.push({ id: ch.id, name: ch.name, sortOrder: ch.sortOrder, contents });
    }
    result.push({ id: sub.id, name: sub.name, sortOrder: sub.sortOrder, chapters: chWithContents });
  }
  return { subjects: result };
}
