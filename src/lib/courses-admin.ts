import { exec, query, ensureColumn } from "@/lib/mysql";
import { removeFile, isLocalUpload } from "@/lib/storage";
let tablesReady = false;
let taxonomyTablesReady = false;
let assignmentTableReady = false;
let chapterTablesReady = false;
let courseMentorsReady = false;


// Admin Panel → Courses. The full catalog lives in MySQL (`catalog_courses`).
// When the table is missing/empty the static catalog in `@/lib/courses`
// is used as fallback so the live site keeps working before migration.

export type CatalogCourseCategory =
  | "SSC Academic"
  | "HSC Academic"
  | "Medical Admission"
  | "Varsity Admission";

const CATALOG_COURSE_CATEGORIES: CatalogCourseCategory[] = [
  "SSC Academic",
  "HSC Academic",
  "Medical Admission",
  "Varsity Admission",
];

export function normalizeCatalogCategory(value: unknown): CatalogCourseCategory {
  return (CATALOG_COURSE_CATEGORIES as string[]).includes(value as string)
    ? (value as CatalogCourseCategory)
    : "HSC Academic";
}

/** Which content structure the student site opens for this course. */
export type CourseContentLayout = "auto" | "direct" | "paper" | "subject";

const COURSE_CONTENT_LAYOUTS: CourseContentLayout[] = [
  "auto",
  "direct",
  "paper",
  "subject",
];

export function normalizeContentLayout(value: unknown): CourseContentLayout {
  return (COURSE_CONTENT_LAYOUTS as string[]).includes(value as string)
    ? (value as CourseContentLayout)
    : "auto";
}

export type CatalogCourse = {
  slug: string;
  name: string;
  category: CatalogCourseCategory;
  /** Course Control master category id (categories → courses link). */
  categoryId?: string | null;
  batchId: string;
  image: string | null;
  shortDescription: string | null;
  description: string | null;
  teacherName: string;
  teacherPhoto: string | null;
  designation: string;
  duration: string;
  fee: number;
  discountFee: number | null;
  features: string[];
  overviewTitle: string;
  overview: string[];
  status: "published" | "unpublished";
  availability: "available" | "hidden";
  couponEnabled: boolean;
  featured: boolean;
  contentLayout: CourseContentLayout;
  /** Derived counts (category-scoped reads only). */
  totalClasses?: number;
  totalExams?: number;
  /** Mentors assigned to this course (single-course reads). */
  mentorIds?: string[];
};

type CatalogCourseRow = {
  slug: string;
  name: string;
  category: string;
  batch_id: string;
  image_url: string | null;
  short_description: string | null;
  description: string | null;
  teacher_name: string;
  teacher_photo_url: string | null;
  teacher_designation: string;
  duration: string;
  fee: string | number;
  discount_fee: string | number | null;
  features: string | null;
  overview_title: string;
  overview: string | null;
  status: string;
  availability: string;
  coupon_enabled: number | boolean;
  is_featured?: number | boolean | null;
  content_layout?: string | null;
};

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toNumber(value: string | number | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function rowToCourse(row: CatalogCourseRow): CatalogCourse {
  return {
    slug: row.slug,
    name: row.name,
    category: normalizeCatalogCategory(row.category),
    categoryId: (row as { category_id?: string | null }).category_id ?? null,
    batchId: row.batch_id,
    image: row.image_url,
    shortDescription: row.short_description,
    description: row.description,
    teacherName: row.teacher_name ?? "",
    teacherPhoto: row.teacher_photo_url,
    designation: row.teacher_designation ?? "",
    duration: row.duration ?? "",
    fee: toNumber(row.fee),
    discountFee:
      row.discount_fee === null || row.discount_fee === undefined
        ? null
        : toNumber(row.discount_fee),
    features: parseJsonArray(row.features),
    overviewTitle: row.overview_title ?? "",
    overview: parseJsonArray(row.overview),
    status: row.status === "published" ? "published" : "unpublished",
    availability: row.availability === "hidden" ? "hidden" : "available",
    couponEnabled: Boolean(row.coupon_enabled),
    contentLayout: normalizeContentLayout(row.content_layout),
    featured: Boolean(row.is_featured),
  };
}

async function ensureTables(): Promise<void> {
  if (tablesReady) return;

  await exec(`CREATE TABLE IF NOT EXISTS catalog_courses (
    slug VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('SSC Academic','HSC Academic','Medical Admission','Varsity Admission') NOT NULL DEFAULT 'HSC Academic',
    batch_id VARCHAR(32) NOT NULL DEFAULT 'hsc-28',
    image_url VARCHAR(1024) NULL,
    short_description TEXT NULL,
    description TEXT NULL,
    teacher_name VARCHAR(255) NOT NULL DEFAULT '',
    teacher_photo_url VARCHAR(1024) NULL,
    teacher_designation VARCHAR(255) NOT NULL DEFAULT '',
    duration VARCHAR(128) NOT NULL DEFAULT '',
    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_fee DECIMAL(10,2) NULL,
    features JSON NULL,
    overview_title VARCHAR(191) NOT NULL DEFAULT '',
    overview JSON NULL,
    status ENUM('published','unpublished') NOT NULL DEFAULT 'unpublished',
    availability ENUM('available','hidden') NOT NULL DEFAULT 'available',
    coupon_enabled TINYINT(1) NOT NULL DEFAULT 0,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(191) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Databases created before the featured flag need the column added.
  try {
    await exec(
      `ensureColumn("catalog_courses", "is_featured", "TINYINT(1) NOT NULL DEFAULT 0")`,
    );
  } catch {
    // Best effort — column may already exist.
  }
  // Links every course to its Course Control category (course_categories.id).
  try {
    await ensureColumn("catalog_courses", "category_id", "`category_id` VARCHAR(191) NULL");
  } catch {
    // Best effort — column may already exist.
  }
  // Course-wise content structure (direct / paper / subject selection).
  try {
    await exec(
      `ensureColumn("catalog_courses", "content_layout", "ENUM('auto','direct','paper','subject') NOT NULL DEFAULT 'auto' AFTER availability")`,
    );
  } catch {
    // Best effort — column may already exist.
  }
  // Databases created by older migrations have the legacy enum
  // ('Academic','Admission') which rejects the current category values
  // with "Data truncated for column 'category'" on every save. Widen the
  // enum first, migrate any legacy rows, then shrink back to 3 values.
  // Each statement is idempotent and fails harmlessly once applied.
  try {
    await exec(
      `ALTER TABLE catalog_courses MODIFY COLUMN category ENUM('SSC Academic','HSC Academic','Medical Admission','Varsity Admission','Academic','Admission') NOT NULL DEFAULT 'HSC Academic'`,
    );
    await exec(
      `UPDATE catalog_courses SET category='Medical Admission' WHERE category='Admission'`,
    );
    await exec(
      `UPDATE catalog_courses SET category='HSC Academic' WHERE category IN ('Academic','')`,
    );
    await exec(
      `ALTER TABLE catalog_courses MODIFY COLUMN category ENUM('SSC Academic','HSC Academic','Medical Admission','Varsity Admission') NOT NULL DEFAULT 'HSC Academic'`,
    );
  } catch {
    // Best effort — already migrated or no permission.
  }
  tablesReady = true;
}

function normalizeCategoryToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Resolve the Course Control category (`course_categories.id`) that owns a
 * catalog category name. Matches on exact normalized name first ("SSC
 * Academic" = "SSC Academic Courses"), then on slug prefix ("ssc academic"
 * starts with "ssc"). Returns null when Course Control has no match yet.
 */
async function resolveCategoryId(
  categoryName: string,
  categories: Array<{ id: string; name: string; slug: string }>,
): Promise<string | null> {
  const token = normalizeCategoryToken(categoryName);
  if (!token) return null;
  return (
    categories.find((c) => normalizeCategoryToken(c.name) === token)?.id ??
    categories.find((c) => normalizeCategoryToken(c.name).startsWith(token))?.id ??
    categories.find((c) => {
      const slugToken = normalizeCategoryToken(c.slug);
      return slugToken.length > 0 && token.startsWith(slugToken);
    })?.id ??
    null
  );
}

/**
 * Keep `catalog_courses.category_id` in sync with Course Control
 * (`course_categories`). Backfills legacy rows that only carry the ENUM
 * `category` display name. Called lazily before category-filtered reads so a
 * course added/renamed/moved in Course Control is reflected immediately.
 */
export async function syncCatalogCategoryIds(): Promise<void> {
  await ensureTables();
  const { ensureSchema } = await import("@/lib/course-categories-store");
  await ensureSchema();
  const categories = await query<Array<{ id: string; name: string; slug: string }>>(
    `SELECT id, name, slug FROM course_categories`,
  );
  if (categories.length === 0) return;
  const rows = await query<
    Array<{ slug: string; category: string; category_id: string | null }>
  >(`SELECT slug, category, category_id FROM catalog_courses`);
  for (const row of rows) {
    const categoryId = await resolveCategoryId(row.category, categories);
    // Re-link when missing or stale (e.g. course moved to another category
    // in Course Control) so Content Control always follows Course Control.
    if (categoryId && categoryId !== (row.category_id ?? "")) {
      await exec(`UPDATE catalog_courses SET category_id = ? WHERE slug = ?`, [
        categoryId,
        row.slug,
      ]);
    }
  }
}

/**
 * THE single reusable "Get Courses By Category" logic. Every Admin Panel
 * section that needs Category → Courses goes through this (directly or via
 * GET /api/admin/courses?categoryId=). Validates that the category exists,
 * re-syncs the course↔category linkage first, then returns ONLY the matching
 * courses from catalog_courses.
 */
export async function getCoursesByCategory(
  rawCategoryId: string,
): Promise<
  | { ok: true; courses: CatalogCourse[] }
  | { ok: false; reason: "invalid-category" | "db-error" }
> {
  const categoryId = rawCategoryId.trim();
  if (!categoryId) return { ok: false, reason: "invalid-category" };
  try {
    // Keep Course Control changes (add/rename/move) reflected immediately.
    await syncCatalogCategoryIds();
    const cats = await query<Array<{ id: string }>>(
      `SELECT id FROM course_categories WHERE id = ? LIMIT 1`,
      [categoryId],
    );
    if (cats.length === 0) return { ok: false, reason: "invalid-category" };
    const rows = await query<CatalogCourseRow[]>(
      `SELECT c.* FROM catalog_courses c
        LEFT JOIN course_categories cc ON cc.id = c.category_id
       WHERE COALESCE(c.category_id, cc.id) = ?
       ORDER BY c.sort_order ASC, c.name ASC`,
      [categoryId],
    );
    const courses = rows.map(rowToCourse);

    // Derived totals (classes / published exams) via the subject bridge —
    // same definition as the public course catalog cards.
    try {
      const slugs = courses.map((course) => course.slug);
      if (slugs.length > 0) {
        const placeholders = slugs.map(() => "?").join(",");
        const [classRows, examRows] = await Promise.all([
          query<{ course_slug: string; cnt: string | number }[]>(
            `SELECT a.course_slug, COUNT(cl.id) AS cnt
               FROM course_subject_assignments a
               JOIN course_chapters ch ON ch.subject_id = a.subject_id AND ch.is_active = 1
               JOIN course_classes cl ON cl.chapter_id = ch.id AND cl.is_active = 1
              WHERE a.course_slug IN (${placeholders})
              GROUP BY a.course_slug`,
            slugs,
          ),
          query<{ course_slug: string; cnt: string | number }[]>(
            `SELECT a.course_slug, COUNT(ex.id) AS cnt
               FROM course_subject_assignments a
               JOIN course_chapters ch ON ch.subject_id = a.subject_id AND ch.is_active = 1
               JOIN exams ex ON ex.chapter_id = ch.id AND ex.status = 'published'
              WHERE a.course_slug IN (${placeholders})
              GROUP BY a.course_slug`,
            slugs,
          ),
        ]);
        const classMap = new Map(classRows.map((r) => [r.course_slug, toNumber(r.cnt)]));
        const examMap = new Map(examRows.map((r) => [r.course_slug, toNumber(r.cnt)]));
        for (const course of courses) {
          course.totalClasses = classMap.get(course.slug) ?? 0;
          course.totalExams = examMap.get(course.slug) ?? 0;
        }
      }
    } catch {
      // Counts are supplementary — never fail the category listing.
    }

    return { ok: true, courses };
  } catch {
    return { ok: false, reason: "db-error" };
  }
}

export async function fetchCatalogCourses(): Promise<CatalogCourse[]> {
  try {
    await ensureTables();
    const rows = await query<CatalogCourseRow[]>(
      `SELECT * FROM catalog_courses ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map(rowToCourse);
  } catch {
    return [];
  }
}

export async function fetchCatalogCourse(
  slug: string,
): Promise<CatalogCourse | null> {
  try {
    await ensureTables();
    const rows = await query<CatalogCourseRow[]>(
      `SELECT * FROM catalog_courses WHERE slug = ? LIMIT 1`,
      [slug],
    );
    if (!rows[0]) return null;
    const course = rowToCourse(rows[0]);
    course.mentorIds = await fetchCourseMentorIds(slug);
    return course;
  } catch {
    return null;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter((item) => item.length > 0);
}

/**
 * Create or update a course from an admin payload.
 * Returns the saved course. Throws on validation errors.
 */
export async function saveCatalogCourse(
  input: Record<string, unknown>,
  adminUid: string,
): Promise<CatalogCourse> {
  await ensureTables();

  const slug = asString(input.slug);
  const name = asString(input.name);
  if (!/^[a-z0-9-]{2,191}$/.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers and dashes.");
  }
  if (name.length < 2) throw new Error("Course name is required.");

  let category = normalizeCatalogCategory(input.category);

  // Link the course to its Course Control category. Prefer an explicit
  // categoryId from the payload; otherwise resolve it from the category name.
  let categoryId = asString(input.categoryId) || null;
  if (!categoryId) {
    const { ensureSchema } = await import("@/lib/course-categories-store");
    await ensureSchema();
    const categories = await query<Array<{ id: string; name: string; slug: string }>>(
      `SELECT id, name, slug FROM course_categories`,
    );
    categoryId = await resolveCategoryId(category, categories);
  }

  // Keep the legacy ENUM column consistent with the Course Control category —
  // syncCatalogCategoryIds() re-links category_id FROM this column on every
  // category-filtered read, so a mismatch silently moves the course out of
  // its category right after save (the form has no category field at all).
  if (categoryId) {
    try {
      const catRows = await query<Array<{ name: string; slug: string }>>(
        "SELECT name, slug FROM course_categories WHERE id = ? LIMIT 1",
        [categoryId],
      );
      const cat = catRows[0];
      if (cat) {
        const token = normalizeCategoryToken(cat.name);
        const slugToken = normalizeCategoryToken(cat.slug);
        const match = CATALOG_COURSE_CATEGORIES.find(
          (value) =>
            normalizeCategoryToken(value) === token ||
            normalizeCategoryToken(value).startsWith(token) ||
            (slugToken.length > 0 &&
              normalizeCategoryToken(value).startsWith(slugToken)),
        );
        if (match) category = match;
      }
    } catch {
      // Keep the payload/default-derived ENUM on lookup failure.
    }
  }

  const batchId = asString(input.batchId, "hsc-28") || "hsc-28";
  const fee = Math.max(0, Number(input.fee) || 0);
  const discountRaw = input.discountFee;
  const discountFee =
    discountRaw === null || discountRaw === undefined || discountRaw === ""
      ? null
      : Math.max(0, Number(discountRaw) || 0);

  await exec(
    `INSERT INTO catalog_courses
       (slug, name, category, category_id, batch_id, image_url, short_description, description,
        teacher_name, teacher_photo_url, teacher_designation, duration,
        fee, discount_fee, features, overview_title, overview,
        status, availability, coupon_enabled, is_featured, content_layout, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), category = VALUES(category), category_id = VALUES(category_id),
       batch_id = VALUES(batch_id),
       image_url = VALUES(image_url), short_description = VALUES(short_description),
       description = VALUES(description), teacher_name = VALUES(teacher_name),
       teacher_photo_url = VALUES(teacher_photo_url),
       teacher_designation = VALUES(teacher_designation), duration = VALUES(duration),
       fee = VALUES(fee), discount_fee = VALUES(discount_fee), features = VALUES(features),
       overview_title = VALUES(overview_title), overview = VALUES(overview),
       status = VALUES(status), availability = VALUES(availability),
       coupon_enabled = VALUES(coupon_enabled), is_featured = VALUES(is_featured),
       content_layout = VALUES(content_layout), updated_by = VALUES(updated_by)`,
    [
      slug,
      name,
      category,
      categoryId,
      batchId,
      asString(input.image) || null,
      asString(input.shortDescription) || null,
      asString(input.description) || null,
      asString(input.teacherName),
      asString(input.teacherPhoto) || null,
      asString(input.designation),
      asString(input.duration),
      fee,
      discountFee,
      JSON.stringify(asStringArray(input.features)),
      asString(input.overviewTitle),
      JSON.stringify(asStringArray(input.overview)),
      input.status === "published" ? "published" : "unpublished",
      input.availability === "hidden" ? "hidden" : "available",
      input.couponEnabled ? 1 : 0,
      input.featured ? 1 : 0,
      normalizeContentLayout(input.contentLayout),
      adminUid,
    ],
  );

  // Mentor association is best-effort — a transient failure here must not
  // fail the whole save when the course row itself is already persisted.
  if (Array.isArray(input.mentorIds)) {
    try {
      await setCourseMentors(
        slug,
        input.mentorIds.map((id: unknown) => String(id)),
      );
    } catch {
      // Non-fatal — admin can re-save to retry the assignment.
    }
  }

  const saved = await fetchCatalogCourse(slug);
  if (!saved) {
    // The row IS in the database (INSERT succeeded) but the re-read failed
    // under transient DB pressure. Return the submitted payload instead of
    // reporting an error — otherwise admins see "Saving…" stuck forever
    // while the course actually exists (and a duplicate add would collide).
    return {
      slug,
      name,
      category,
      categoryId,
      batchId,
      image: asString(input.image) || null,
      shortDescription: asString(input.shortDescription) || null,
      description: asString(input.description) || null,
      teacherName: asString(input.teacherName),
      teacherPhoto: asString(input.teacherPhoto) || null,
      designation: asString(input.designation),
      duration: asString(input.duration),
      fee,
      discountFee,
      features: asStringArray(input.features),
      overviewTitle: asString(input.overviewTitle),
      overview: asStringArray(input.overview),
      status: input.status === "published" ? "published" : "unpublished",
      availability: input.availability === "hidden" ? "hidden" : "available",
      couponEnabled: Boolean(input.couponEnabled),
      featured: Boolean(input.featured),
      contentLayout: normalizeContentLayout(input.contentLayout),
      mentorIds: [],
    };
  }
  saved.mentorIds = await fetchCourseMentorIds(slug);
  return saved;
}

// ── Course ↔ Mentors association ─────────────────────────────────────────

async function ensureCourseMentorsTable(): Promise<void> {
  if (courseMentorsReady) return;
  await exec(`CREATE TABLE IF NOT EXISTS course_mentors (
    course_slug VARCHAR(191) NOT NULL,
    mentor_id VARCHAR(191) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (course_slug, mentor_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  courseMentorsReady = true;
}

/** Mentor ids assigned to a course (ordered). */
export async function fetchCourseMentorIds(slug: string): Promise<string[]> {
  try {
    await ensureCourseMentorsTable();
    const rows = await query<Array<{ mentor_id: string }>>(
      `SELECT mentor_id FROM course_mentors
        WHERE course_slug = ? ORDER BY sort_order ASC, mentor_id ASC`,
      [slug],
    );
    return rows.map((row) => row.mentor_id);
  } catch {
    return [];
  }
}

/** Replace a course's mentor assignment list. */
export async function setCourseMentors(
  slug: string,
  mentorIds: string[],
): Promise<void> {
  await ensureCourseMentorsTable();
  const unique = Array.from(
    new Set(mentorIds.map((id) => id.trim()).filter(Boolean)),
  );
  await exec(`DELETE FROM course_mentors WHERE course_slug = ?`, [slug]);
  for (let index = 0; index < unique.length; index += 1) {
    await exec(
      `INSERT IGNORE INTO course_mentors (course_slug, mentor_id, sort_order)
       VALUES (?, ?, ?)`,
      [slug, unique[index], index + 1],
    );
  }
}

/** Quick flags update — publish/unpublish and/or feature a course. */
export async function setCatalogCourseFlags(
  slug: string,
  patch: { status?: "published" | "unpublished"; featured?: boolean },
): Promise<CatalogCourse> {  await ensureTables();
  const existing = await fetchCatalogCourse(slug);
  if (!existing) throw new Error("Course not found.");
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    values.push(patch.status);
  }
  if (patch.featured !== undefined) {
    sets.push("is_featured = ?");
    values.push(patch.featured ? 1 : 0);
  }
  if (sets.length > 0) {
    values.push(slug);
    await exec(`UPDATE catalog_courses SET ${sets.join(", ")} WHERE slug = ?`, values);
  }
  const saved = await fetchCatalogCourse(slug);
  if (!saved) throw new Error("Failed to update the course.");
  return saved;
}

/** Delete a course and clean up its local uploaded image. */
/**
 * Completely remove a course: the catalog record itself plus every
 * Course-Control-linked reference — subject assignments (content bridge),
 * mentor assignments, ★ Featured marketing entry and its Home Control card.
 * Student enrollment records are intentionally KEPT (data protection) so
 * purchase history never disappears silently.
 */
export async function deleteCatalogCourse(slug: string): Promise<boolean> {
  await ensureTables();
  const existing = await fetchCatalogCourse(slug);
  if (!existing) return false;
  await exec(`DELETE FROM catalog_courses WHERE slug = ?`, [slug]);
  // Content bridge + per-course extras.
  try {
    await exec(`DELETE FROM course_subject_assignments WHERE course_slug = ?`, [slug]);
    await exec(`DELETE FROM course_mentors WHERE course_slug = ?`, [slug]);
  } catch {
    // Tables may predate these features — ignore and continue.
  }
  // Marketing/homepage references so the course vanishes everywhere.
  try {
    await exec(`DELETE FROM featured_courses WHERE course_slug = ?`, [slug]);
  } catch {
    // Optional table.
  }
  try {
    await exec(`DELETE FROM homepage_courses WHERE slug = ?`, [slug]);
  } catch {
    // Optional table.
  }
  // Keep the legacy `courses` registry (referenced by enrollments) intact.
  if (existing.image && isLocalUpload(existing.image)) {
    await removeFile(existing.image);
  }
  return true;
}

/** Bulk pricing update — set fee/discount for many courses at once. */
export async function savePricingUpdates(
  updates: Array<Record<string, unknown>>,
  adminUid: string,
): Promise<number> {
  await ensureTables();
  let count = 0;
  for (const raw of updates) {
    const slug = asString(raw.slug);
    if (!slug) continue;
    const fee = Math.max(0, Number(raw.fee));
    const discountRaw = raw.discountFee;
    const discountFee =
      discountRaw === null || discountRaw === undefined || discountRaw === ""
        ? null
        : Math.max(0, Number(discountRaw) || 0);
    const result = await exec(
      `UPDATE catalog_courses SET fee = ?, discount_fee = ?, updated_by = ? WHERE slug = ?`,
      [fee, discountFee, adminUid, slug],
    );
    count += result.affectedRows ?? 0;
  }
  return count;
}

// ── Categories / Subjects ────────────────────────────────────────────────

export type CourseTaxonomyItem = {
  id: string;
  name: string;
  isActive: boolean;
};

type TaxonomyRow = {
  id: string;
  name: string;
  is_active: number | boolean;
};

async function ensureTaxonomyTables(): Promise<void> {
  if (taxonomyTablesReady) return;
  // course_categories is owned by @/lib/course-categories-store — reuse its
  // schema so both modules never create conflicting table definitions.
  const { ensureSchema } = await import("@/lib/course-categories-store");
  await ensureSchema();
  await exec(`CREATE TABLE IF NOT EXISTS course_subjects (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT '',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  taxonomyTablesReady = true;
}

async function fetchTaxonomy(
  table: "course_categories" | "course_subjects",
): Promise<CourseTaxonomyItem[]> {
  await ensureTaxonomyTables();
  const rows = await query<TaxonomyRow[]>(
    `SELECT id, name, is_active FROM ${table} ORDER BY sort_order ASC, name ASC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isActive: Boolean(row.is_active),
  }));
}

async function saveTaxonomy(
  table: "course_categories" | "course_subjects",
  items: Array<Record<string, unknown>>,
): Promise<CourseTaxonomyItem[]> {
  await ensureTaxonomyTables();
  for (const [index, raw] of items.entries()) {
    const name = asString(raw.name);
    if (!name) continue;
    const id =
      asString(raw.id) ||
      `${table === "course_categories" ? "cat" : "sub"}-${Date.now()}-${index}`;
    await exec(
      `INSERT INTO ${table} (id, name, is_active, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active), sort_order = VALUES(sort_order)`,
      [id, name, raw.isActive === false ? 0 : 1, index],
    );
  }
  return fetchTaxonomy(table);
}

export async function deleteTaxonomyItem(
  table: "course_categories" | "course_subjects",
  id: string,
): Promise<void> {
  await ensureTaxonomyTables();
  await exec(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (table === "course_subjects") {
    await ensureAssignmentTable();
    await exec(`DELETE FROM course_subject_assignments WHERE subject_id = ?`, [id]);
  }
}

export const fetchCourseCategories = () =>
  fetchTaxonomy("course_categories");
export const saveCourseCategories = (items: Array<Record<string, unknown>>) =>
  saveTaxonomy("course_categories", items);

/** Subject with its course assignments — used by the Subjects admin page/API. */
export type CourseSubjectDetail = CourseTaxonomyItem & {
  assignedCourseSlugs: string[];
};

async function ensureAssignmentTable(): Promise<void> {
  if (assignmentTableReady) return;
  await exec(`CREATE TABLE IF NOT EXISTS course_subject_assignments (
    subject_id VARCHAR(64) NOT NULL,
    course_slug VARCHAR(191) NOT NULL,
    PRIMARY KEY (subject_id, course_slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  assignmentTableReady = true;
}

async function fetchAssignmentMap(): Promise<Map<string, string[]>> {
  await ensureAssignmentTable();
  const rows = await query<{ subject_id: string; course_slug: string }[]>(
    `SELECT subject_id, course_slug FROM course_subject_assignments`,
  );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.subject_id) ?? [];
    list.push(row.course_slug);
    map.set(row.subject_id, list);
  }
  return map;
}

/** All subjects incl. assigned course slugs. */
export async function fetchCourseSubjectDetails(): Promise<CourseSubjectDetail[]> {
  const [subjects, assignments] = await Promise.all([
    fetchCourseSubjects(),
    fetchAssignmentMap(),
  ]);
  return subjects.map((subject) => ({
    ...subject,
    assignedCourseSlugs: assignments.get(subject.id) ?? [],
  }));
}

export async function setSubjectAssignments(
  subjectId: string,
  courseSlugs: string[],
): Promise<void> {
  await ensureAssignmentTable();
  await exec(`DELETE FROM course_subject_assignments WHERE subject_id = ?`, [
    subjectId,
  ]);
  const unique = [...new Set(courseSlugs.filter((slug) => slug.length > 0))];
  for (const slug of unique) {
    await exec(
      `INSERT IGNORE INTO course_subject_assignments (subject_id, course_slug) VALUES (?, ?)`,
      [subjectId, slug],
    );
  }
}

/** Single-subject update: rename / toggle / change course assignments. */
export async function updateCourseSubject(
  id: string,
  patch: {
    name?: string;
    isActive?: boolean;
    assignedCourseSlugs?: string[];
  },
): Promise<CourseSubjectDetail[]> {
  await ensureTaxonomyTables();
  const existing = await query<{ id: string }[]>(
    `SELECT id FROM course_subjects WHERE id = ? LIMIT 1`,
    [id],
  );
  if (existing.length === 0) throw new Error("Subject not found.");

  if (patch.name !== undefined) {
    const name = asString(patch.name);
    if (!name) throw new Error("Subject name is required.");
    await exec(`UPDATE course_subjects SET name = ? WHERE id = ?`, [name, id]);
  }
  if (patch.isActive !== undefined) {
    await exec(`UPDATE course_subjects SET is_active = ? WHERE id = ?`, [
      patch.isActive ? 1 : 0,
      id,
    ]);
  }
  if (patch.assignedCourseSlugs !== undefined) {
    await setSubjectAssignments(id, patch.assignedCourseSlugs);
  }
  return fetchCourseSubjectDetails();
}

/**
 * Course options for assignment pickers — DB catalog first,
 * static fallback catalog when the DB has no courses yet.
 */
export async function fetchCourseOptions(): Promise<
  Array<{ slug: string; name: string }>
> {
  try {
    const catalog = await fetchCatalogCourses();
    if (catalog.length > 0) {
      return catalog.map((course) => ({ slug: course.slug, name: course.name }));
    }
  } catch {
    // Fall through to the static catalog.
  }
  const { courses } = await import("@/lib/courses");
  return courses.map((course) => ({ slug: course.slug, name: course.name }));
}
export const fetchCourseSubjects = () => fetchTaxonomy("course_subjects");
export const saveCourseSubjects = (items: Array<Record<string, unknown>>) =>
  saveTaxonomy("course_subjects", items);

// ── Chapters / Classes ───────────────────────────────────────────────────

export type Chapter = {
  id: string;
  subjectId: string;
  name: string;
  isActive: boolean;
};

export type CourseClass = {
  id: string;
  chapterId: string;
  title: string;
  videoUrl: string | null;
  noteUrl: string | null;
  durationMinutes: number;
  isFree: boolean;
  isActive: boolean;
};

type ChapterRow = {
  id: string;
  subject_id: string;
  name: string;
  is_active: number | boolean;
};

type ClassRow = ChapterRow & {
  chapter_id: string;
  title: string;
  video_url: string | null;
  note_url: string | null;
  duration_minutes: number;
  is_free: number | boolean;
};

async function ensureChapterTables(): Promise<void> {
  if (chapterTablesReady) return;
  await exec(`CREATE TABLE IF NOT EXISTS course_chapters (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    subject_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await exec(`CREATE TABLE IF NOT EXISTS course_classes (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    chapter_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(1024) NULL,
    note_url VARCHAR(1024) NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    is_free TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  chapterTablesReady = true;
}

export async function fetchChapters(subjectId?: string): Promise<Chapter[]> {
  await ensureChapterTables();
  const rows = subjectId
    ? await query<ChapterRow[]>(
        `SELECT id, subject_id, name, is_active FROM course_chapters WHERE subject_id = ? ORDER BY sort_order ASC`,
        [subjectId],
      )
    : await query<ChapterRow[]>(
        `SELECT id, subject_id, name, is_active FROM course_chapters ORDER BY sort_order ASC`,
      );
  return rows.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    isActive: Boolean(row.is_active),
  }));
}

export async function saveChapter(
  input: Record<string, unknown>,
): Promise<Chapter[]> {
  await ensureChapterTables();
  const name = asString(input.name);
  const subjectId = asString(input.subjectId);
  if (!name) throw new Error("Chapter name is required.");
  if (!subjectId) throw new Error("A subject must be selected.");
  const id = asString(input.id) || `ch-${Date.now()}`;
  await exec(
    `INSERT INTO course_chapters (id, subject_id, name, is_active)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE subject_id = VALUES(subject_id), name = VALUES(name), is_active = VALUES(is_active)`,
    [id, subjectId, name, input.isActive === false ? 0 : 1],
  );
  return fetchChapters();
}

/** Single-chapter update: rename / re-assign subject / enable-disable. */
export async function updateChapter(
  id: string,
  patch: {
    name?: string;
    subjectId?: string;
    isActive?: boolean;
  },
): Promise<Chapter[]> {
  await ensureChapterTables();
  const existing = await query<{ id: string }[]>(
    `SELECT id FROM course_chapters WHERE id = ? LIMIT 1`,
    [id],
  );
  if (existing.length === 0) throw new Error("Chapter not found.");

  if (patch.name !== undefined) {
    const name = asString(patch.name);
    if (!name) throw new Error("Chapter name is required.");
    await exec(`UPDATE course_chapters SET name = ? WHERE id = ?`, [name, id]);
  }
  if (patch.subjectId !== undefined) {
    const subjectId = asString(patch.subjectId);
    if (!subjectId) throw new Error("A subject must be selected.");
    await exec(`UPDATE course_chapters SET subject_id = ? WHERE id = ?`, [
      subjectId,
      id,
    ]);
  }
  if (patch.isActive !== undefined) {
    await exec(`UPDATE course_chapters SET is_active = ? WHERE id = ?`, [
      patch.isActive ? 1 : 0,
      id,
    ]);
  }
  return fetchChapters();
}

/** Change display order of chapters from an ordered id list. */
export async function reorderChapters(orderedIds: string[]): Promise<Chapter[]> {
  await ensureChapterTables();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec(`UPDATE course_chapters SET sort_order = ? WHERE id = ?`, [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchChapters();
}

export async function deleteChapter(id: string): Promise<Chapter[]> {
  await ensureChapterTables();
  await exec(`DELETE FROM course_classes WHERE chapter_id = ?`, [id]);
  await exec(`DELETE FROM course_chapters WHERE id = ?`, [id]);
  return fetchChapters();
}

export async function fetchClasses(chapterId?: string): Promise<CourseClass[]> {
  await ensureChapterTables();
  const rows = chapterId
    ? await query<ClassRow[]>(
        `SELECT id, chapter_id, title, video_url, note_url, duration_minutes, is_free, is_active
         FROM course_classes WHERE chapter_id = ? ORDER BY sort_order ASC`,
        [chapterId],
      )
    : await query<ClassRow[]>(
        `SELECT id, chapter_id, title, video_url, note_url, duration_minutes, is_free, is_active
         FROM course_classes ORDER BY sort_order ASC`,
      );
  return rows.map((row) => ({
    id: row.id,
    chapterId: row.chapter_id,
    title: row.title,
    videoUrl: row.video_url,
    noteUrl: row.note_url,
    durationMinutes: row.duration_minutes ?? 0,
    isFree: Boolean(row.is_free),
    isActive: Boolean(row.is_active),
  }));
}

export async function saveClass(
  input: Record<string, unknown>,
): Promise<CourseClass[]> {
  await ensureChapterTables();
  const title = asString(input.title);
  const chapterId = asString(input.chapterId);
  if (!title) throw new Error("Class title is required.");
  if (!chapterId) throw new Error("A chapter must be selected.");
  const id = asString(input.id) || `cls-${Date.now()}`;
  await exec(
    `INSERT INTO course_classes (id, chapter_id, title, video_url, note_url, duration_minutes, is_free, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE chapter_id = VALUES(chapter_id), title = VALUES(title),
       video_url = VALUES(video_url), note_url = VALUES(note_url),
       duration_minutes = VALUES(duration_minutes), is_free = VALUES(is_free),
       is_active = VALUES(is_active)`,
    [
      id,
      chapterId,
      title,
      asString(input.videoUrl) || null,
      asString(input.noteUrl) || null,
      Math.max(0, Number(input.durationMinutes) || 0),
      input.isFree ? 1 : 0,
      input.isActive === false ? 0 : 1,
    ],
  );
  return fetchClasses();
}

export async function deleteClass(id: string): Promise<CourseClass[]> {
  await ensureChapterTables();
  await exec(`DELETE FROM course_classes WHERE id = ?`, [id]);
  return fetchClasses();
}

/** Change display order of classes from an ordered id list. */
export async function reorderClasses(orderedIds: string[]): Promise<CourseClass[]> {
  await ensureChapterTables();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec(`UPDATE course_classes SET sort_order = ? WHERE id = ?`, [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchClasses();
}
