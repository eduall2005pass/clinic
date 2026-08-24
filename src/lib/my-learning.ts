import { query } from "@/lib/mysql";

// ── Shared types (consumed by API routes + client components) ────────────

export type EnrolledCourseSummary = {
  slug: string;
  name: string;
  category: string;
  batchId: string;
  imageUrl: string;
  shortDescription: string;
  fee: number;
  discountFee: number | null;
  courseKind: "free" | "paid";
  enrollmentStatus: string;
  enrollmentDate: string;
  progress: {
    totalClasses: number;
    completedClasses: number;
    percent: number;
  };
};

export type ClassItem = {
  id: string;
  title: string;
  videoUrl: string;
  noteUrl: string;
  durationMinutes: number;
  isFree: boolean;
  completed: boolean;
  lastSeenSeconds: number;
  isFavourite: boolean;
};

export type MaterialItem = {
  id: number;
  title: string;
  materialType: string;
  fileUrl: string;
  isFavourite: boolean;
};

export type ChapterItem = {
  id: string;
  name: string;
  paperId: string | null;
  classes: ClassItem[];
  materials: MaterialItem[];
  exams: { id: string; title: string; durationMinutes: number; totalMarks: number }[];
};

export type PaperItem = {
  id: string;
  name: string;
  kind: "paper" | "segment";
};

export type SubjectTree = {
  id: string;
  name: string;
  papers: PaperItem[];
  chapters: ChapterItem[];
};

export type CourseLearningData = {
  slug: string;
  name: string;
  category: string;
  batchId: string;
  imageUrl: string;
  shortDescription: string;
  description: string;
  teacherName: string;
  duration: string;
  fee: number;
  discountFee: number | null;
  courseKind: "free" | "paid";
  enrollmentStatus: string;
  enrollmentDate: string;
  progress: {
    totalClasses: number;
    completedClasses: number;
    percent: number;
  };
  subjects: SubjectTree[];
};

// ── Helpers ───────────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function loadProgress(uid: string): Promise<Map<string, { completed: boolean; lastSeenSeconds: number }>> {
  const rows = await query<
    { class_id: string; completed: number; last_seen_seconds: number }[]
  >(
    "SELECT class_id, completed, last_seen_seconds FROM student_class_progress WHERE student_uid = ?",
    [uid],
  );
  return new Map(
    rows.map((row) => [
      row.class_id,
      { completed: row.completed === 1, lastSeenSeconds: toNumber(row.last_seen_seconds) },
    ]),
  );
}

async function loadFavourites(uid: string): Promise<Set<string>> {
  const rows = await query<{ item_type: string; item_id: string }[]>(
    "SELECT item_type, item_id FROM student_favourites WHERE student_uid = ?",
    [uid],
  );
  return new Set(rows.map((row) => `${row.item_type}:${row.item_id}`));
}

export async function hasActiveEnrollment(
  uid: string,
  courseId: string,
): Promise<boolean> {
  const rows = await query<{ found: number }[]>(
    "SELECT 1 AS found FROM enrollments WHERE student_uid = ? AND course_id = ? AND enrollment_status = 'active' LIMIT 1",
    [uid, courseId],
  );
  return rows.length > 0;
}

// ── Enrolled course list ──────────────────────────────────────────────────

type EnrolledCourseRow = {
  slug: string;
  name: string;
  category: string;
  batch_id: string;
  image_url: string | null;
  short_description: string | null;
  fee: number;
  discount_fee: number | null;
  course_kind: "free" | "paid";
  enrollment_status: string;
  enrollment_date: Date | string;
};

export async function getMyEnrolledCourses(
  uid: string,
): Promise<EnrolledCourseSummary[]> {
  // Active enrollment covers all three paths: enrolled (free), purchased
  // (paid + approved) and assigned by an admin. Pending/cancelled rows are
  // never shown as courses.
  const rows = await query<EnrolledCourseRow[]>(
    `SELECT c.slug, c.name, c.category, c.batch_id, c.image_url,
            c.short_description, c.fee, c.discount_fee,
            e.course_kind, e.enrollment_status, e.enrollment_date
       FROM enrollments e
       LEFT JOIN catalog_courses c ON c.slug = e.course_id
      WHERE e.student_uid = ?
        AND e.enrollment_status = 'active'
      ORDER BY e.updated_at DESC`,
    [uid],
  );

  const progressRows = await query<{ course_slug: string; total: number; done: number }[]>(
    `SELECT a.course_slug,
            COUNT(cl.id) AS total,
            SUM(CASE WHEN p.completed = 1 THEN 1 ELSE 0 END) AS done
       FROM course_subject_assignments a
       JOIN course_chapters ch ON ch.subject_id = a.subject_id AND ch.is_active = 1
       JOIN course_classes cl ON cl.chapter_id = ch.id AND cl.is_active = 1
       LEFT JOIN student_class_progress p
              ON p.class_id = cl.id AND p.student_uid = ?
      WHERE a.course_slug IN (${rows.map(() => "?").join(",") || "''"})
      GROUP BY a.course_slug`,
    [uid, ...rows.map((row) => row.slug)],
  );
  const progressMap = new Map(progressRows.map((row) => [row.course_slug, row]));

  return rows.map((row) => {
    const progress = progressMap.get(row.slug);
    const totalClasses = toNumber(progress?.total ?? 0);
    const completedClasses = toNumber(progress?.done ?? 0);
    return {
      slug: row.slug,
      name: toStringOrNull(row.name) ?? row.slug,
      category: row.category ?? "",
      batchId: row.batch_id ?? "",
      imageUrl: toStringOrNull(row.image_url) ?? "",
      shortDescription: toStringOrNull(row.short_description) ?? "",
      fee: toNumber(row.fee),
      discountFee:
        row.discount_fee !== null && row.discount_fee !== undefined
          ? toNumber(row.discount_fee)
          : null,
      courseKind: row.course_kind,
      enrollmentStatus: row.enrollment_status,
      enrollmentDate:
        row.enrollment_date instanceof Date
          ? row.enrollment_date.toISOString()
          : String(row.enrollment_date ?? ""),
      progress: {
        totalClasses,
        completedClasses,
        percent:
          totalClasses > 0
            ? Math.round((completedClasses / totalClasses) * 100)
            : 0,
      },
    };
  });
}

// ── Full course learning tree ─────────────────────────────────────────────

type CatalogRow = {
  slug: string;
  name: string;
  category: string;
  batch_id: string;
  image_url: string | null;
  short_description: string | null;
  description: string | null;
  teacher_name: string | null;
  duration: string | null;
  fee: number;
  discount_fee: number | null;
};

type EnrollmentMetaRow = {
  course_kind: "free" | "paid";
  enrollment_status: string;
  enrollment_date: Date | string;
};

type SubjectRow = { id: string; name: string };
type PaperRow = { id: string; subject_id: string; name: string; kind: "paper" | "segment" };
type ChapterRow = { id: string; subject_id: string; paper_id: string | null; name: string };
type ClassRow = {
  id: string;
  chapter_id: string;
  title: string;
  video_url: string | null;
  note_url: string | null;
  duration_minutes: number;
  is_free: number;
};
type MaterialRow = {
  id: number;
  chapter_id: string;
  title: string;
  material_type: string;
  file_url: string;
};
type ExamRow = {
  id: string;
  chapter_id: string | null;
  title: string;
  duration_minutes: number;
  total_marks: number;
};

export async function getCourseLearningData(
  uid: string,
  slug: string,
): Promise<CourseLearningData | null> {
  const enrollmentRows = await query<EnrollmentMetaRow[]>(
    "SELECT course_kind, enrollment_status, enrollment_date FROM enrollments WHERE student_uid = ? AND course_id = ? LIMIT 1",
    [uid, slug],
  );
  const enrollment = enrollmentRows[0];
  if (!enrollment || enrollment.enrollment_status !== "active") {
    return null;
  }

  const catalogRows = await query<CatalogRow[]>(
    "SELECT slug, name, category, batch_id, image_url, short_description, description, teacher_name, duration, fee, discount_fee FROM catalog_courses WHERE slug = ? LIMIT 1",
    [slug],
  );
  const catalog = catalogRows[0];
  if (!catalog) return null;

  const [subjects, progress, favourites] = await Promise.all([
    query<SubjectRow[]>(
      `SELECT s.id, s.name
         FROM course_subjects s
         JOIN course_subject_assignments a ON a.subject_id = s.id
        WHERE a.course_slug = ? AND s.is_active = 1
        ORDER BY s.sort_order, s.name`,
      [slug],
    ),
    loadProgress(uid),
    loadFavourites(uid),
  ]);

  if (subjects.length === 0) {
    return buildCourseData(catalog, enrollment, [], progress, favourites);
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const subjectPlaceholders = subjectIds.map(() => "?").join(",");

  const [papers, chapters] = await Promise.all([
    query<PaperRow[]>(
      `SELECT id, subject_id, name, kind FROM course_papers
        WHERE subject_id IN (${subjectPlaceholders}) AND is_active = 1
        ORDER BY sort_order, name`,
      subjectIds,
    ),
    query<ChapterRow[]>(
      `SELECT id, subject_id, paper_id, name FROM course_chapters
        WHERE subject_id IN (${subjectPlaceholders}) AND is_active = 1
        ORDER BY sort_order, name`,
      subjectIds,
    ),
  ]);

  const chapterIds = chapters.map((chapter) => chapter.id);

  let classes: ClassRow[] = [];
  let materials: MaterialRow[] = [];
  let exams: ExamRow[] = [];

  if (chapterIds.length > 0) {
    const chapterPlaceholders = chapterIds.map(() => "?").join(",");
    [classes, materials, exams] = await Promise.all([
      query<ClassRow[]>(
        `SELECT id, chapter_id, title, video_url, note_url, duration_minutes, is_free
           FROM course_classes
          WHERE chapter_id IN (${chapterPlaceholders}) AND is_active = 1
          ORDER BY sort_order, created_at`,
        chapterIds,
      ),
      query<MaterialRow[]>(
        `SELECT id, chapter_id, title, material_type, file_url
           FROM course_materials
          WHERE chapter_id IN (${chapterPlaceholders}) AND is_active = 1
          ORDER BY sort_order, id`,
        chapterIds,
      ),
      query<ExamRow[]>(
        `SELECT id, chapter_id, title, duration_minutes, total_marks
           FROM exams
          WHERE chapter_id IN (${chapterPlaceholders}) AND status = 'published'
          ORDER BY scheduled_at DESC`,
        chapterIds,
      ),
    ]);
  }

  return buildCourseData(catalog, enrollment, subjects, progress, favourites, {
    papers,
    chapters,
    classes,
    materials,
    exams,
  });
}

function buildCourseData(
  catalog: CatalogRow,
  enrollment: EnrollmentMetaRow,
  subjects: SubjectRow[],
  progress: Map<string, { completed: boolean; lastSeenSeconds: number }>,
  favourites: Set<string>,
  content?: {
    papers: PaperRow[];
    chapters: ChapterRow[];
    classes: ClassRow[];
    materials: MaterialRow[];
    exams: ExamRow[];
  },
): CourseLearningData {
  const tree: SubjectTree[] = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    papers: [],
    chapters: [],
  }));
  const subjectById = new Map(tree.map((subject) => [subject.id, subject]));

  for (const paper of content?.papers ?? []) {
    subjectById.get(paper.subject_id)?.papers.push({
      id: paper.id,
      name: paper.name,
      kind: paper.kind,
    });
  }

  const chaptersBySubject = new Map<string, ChapterItem[]>();
  for (const chapter of content?.chapters ?? []) {
    const item: ChapterItem = {
      id: chapter.id,
      name: chapter.name,
      paperId: chapter.paper_id,
      classes: [],
      materials: [],
      exams: [],
    };
    const list = chaptersBySubject.get(chapter.subject_id) ?? [];
    list.push(item);
    chaptersBySubject.set(chapter.subject_id, list);
  }
  for (const [subjectId, list] of chaptersBySubject) {
    const subject = subjectById.get(subjectId);
    if (subject) subject.chapters = list;
  }

  const chapterById = new Map<string, ChapterItem>();
  for (const list of chaptersBySubject.values()) {
    for (const chapter of list) chapterById.set(chapter.id, chapter);
  }

  for (const cls of content?.classes ?? []) {
    const chapter = chapterById.get(cls.chapter_id);
    if (!chapter) continue;
    const progressEntry = progress.get(cls.id);
    chapter.classes.push({
      id: cls.id,
      title: cls.title,
      videoUrl: toStringOrNull(cls.video_url) ?? "",
      noteUrl: toStringOrNull(cls.note_url) ?? "",
      durationMinutes: toNumber(cls.duration_minutes),
      isFree: cls.is_free === 1,
      completed: progressEntry?.completed ?? false,
      lastSeenSeconds: progressEntry?.lastSeenSeconds ?? 0,
      isFavourite: favourites.has(`class:${cls.id}`),
    });
  }

  for (const material of content?.materials ?? []) {
    const chapter = chapterById.get(material.chapter_id);
    if (!chapter) continue;
    chapter.materials.push({
      id: material.id,
      title: material.title,
      materialType: material.material_type,
      fileUrl: material.file_url,
      isFavourite: favourites.has(`material:${material.id}`),
    });
  }

  for (const exam of content?.exams ?? []) {
    const chapter = exam.chapter_id ? chapterById.get(exam.chapter_id) : undefined;
    if (!chapter) continue;
    chapter.exams.push({
      id: exam.id,
      title: exam.title,
      durationMinutes: toNumber(exam.duration_minutes),
      totalMarks: toNumber(exam.total_marks),
    });
  }

  const totalClasses = [...chapterById.values()].reduce(
    (sum, chapter) => sum + chapter.classes.length,
    0,
  );
  const completedClasses = [...chapterById.values()].reduce(
    (sum, chapter) => sum + chapter.classes.filter((cls) => cls.completed).length,
    0,
  );

  return {
    slug: catalog.slug,
    name: catalog.name,
    category: catalog.category,
    batchId: catalog.batch_id,
    imageUrl: toStringOrNull(catalog.image_url) ?? "",
    shortDescription: toStringOrNull(catalog.short_description) ?? "",
    description: toStringOrNull(catalog.description) ?? "",
    teacherName: toStringOrNull(catalog.teacher_name) ?? "",
    duration: toStringOrNull(catalog.duration) ?? "",
    fee: toNumber(catalog.fee),
    discountFee:
      catalog.discount_fee !== null && catalog.discount_fee !== undefined
        ? toNumber(catalog.discount_fee)
        : null,
    courseKind: enrollment.course_kind,
    enrollmentStatus: enrollment.enrollment_status,
    enrollmentDate:
      enrollment.enrollment_date instanceof Date
        ? enrollment.enrollment_date.toISOString()
        : String(enrollment.enrollment_date ?? ""),
    progress: {
      totalClasses,
      completedClasses,
      percent:
        totalClasses > 0
          ? Math.round((completedClasses / totalClasses) * 100)
          : 0,
    },
    subjects: tree,
  };
}
