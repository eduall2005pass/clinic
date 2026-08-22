import { exec, query } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";

export const COURSE_CATEGORIES_STORAGE_DIR = "course-categories";

export type CourseCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  href: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

type CourseCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  href: string | null;
  image_url: string | null;
  is_active: number | boolean;
  sort_order: number;
};

/** Fallback used when the database has no categories yet. */
export const DEFAULT_COURSE_CATEGORIES: CourseCategory[] = [
  {
    id: "category-ssc",
    slug: "ssc",
    name: "SSC Academic Courses",
    description:
      "Complete SSC academic preparation — every subject with batch-wise courses and board exam-focused explanations.",
    href: "/courses/ssc",
    imageUrl: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "category-hsc",
    slug: "hsc",
    name: "HSC Academic Courses",
    description:
      "Complete HSC academic preparation — every subject with batch-wise courses and board exam-focused explanations.",
    href: "/courses/academic",
    imageUrl: null,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "category-medical",
    slug: "medical",
    name: "Medical Admission Courses",
    description:
      "Focused medical admission preparation — combined syllabus training with exam strategy for the medical entrance race.",
    href: "/courses/admission",
    imageUrl: null,
    isActive: true,
    sortOrder: 3,
  },
];

const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"] as const;
export { ALLOWED_IMAGE_EXTENSIONS as ALLOWED_CATEGORY_IMAGE_EXTENSIONS };
export const MAX_CATEGORY_IMAGE_SIZE = 5 * 1024 * 1024;

export async function ensureSchema(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS course_categories (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      slug VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      href VARCHAR(1024) NULL,
      image_url VARCHAR(1024) NULL,
      image_storage_path VARCHAR(1024) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_course_categories_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

function rowToCategory(row: CourseCategoryRow): CourseCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    href: row.href?.trim() ? row.href : `/courses/${row.slug}`,
    imageUrl: row.image_url ?? null,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function validateImageFile(file: File): string | null {
  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : "";
  if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extension as never)) {
    return "Unsupported image type. Use PNG, JPG, WebP, GIF or SVG.";
  }
  if (file.size > MAX_CATEGORY_IMAGE_SIZE) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

async function deleteCategoryImage(storagePath: string | null | undefined): Promise<void> {
  if (typeof storagePath !== "string" || storagePath.length === 0) return;
  if (!isLocalUpload(storagePath)) return;
  try {
    await removeFile(storagePath);
  } catch {
    // Best-effort cleanup.
  }
}

/** All categories (including inactive), ordered — used by the Admin Panel. */
export async function fetchAllCourseCategories(): Promise<CourseCategory[]> {
  try {
    await ensureSchema();
    const rows = await query<CourseCategoryRow[]>(
      `SELECT id, slug, name, description, href, image_url, is_active, sort_order
       FROM course_categories ORDER BY sort_order ASC, created_at ASC`,
    );
    return rows.map(rowToCategory);
  } catch {
    return [];
  }
}

/** Active categories in order — used by the live website and course system. */
export async function fetchActiveCourseCategories(): Promise<CourseCategory[]> {
  try {
    await ensureSchema();
    const rows = await query<CourseCategoryRow[]>(
      `SELECT id, slug, name, description, href, image_url, is_active, sort_order
       FROM course_categories WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC`,
    );
    return rows.length > 0 ? rows.map(rowToCategory) : DEFAULT_COURSE_CATEGORIES;
  } catch {
    return DEFAULT_COURSE_CATEGORIES;
  }
}

export async function createCourseCategory(input: {
  name: string;
  slug?: string | null;
  description?: string | null;
  href?: string | null;
}): Promise<CourseCategory[]> {
  await ensureSchema();

  const name = input.name.trim();
  if (name.length === 0 || name.length > 255) {
    throw new Error("Category name is required and must be under 255 characters.");
  }

  let slug = normalizeSlug(input.slug?.trim() || name);
  if (slug.length === 0) slug = `category-${Date.now()}`;

  const existing = await query<{ slug: string }[]>(
    "SELECT slug FROM course_categories WHERE slug = ? LIMIT 1",
    [slug],
  );
  if (existing.length > 0) {
    throw new Error(`A category with slug "${slug}" already exists.`);
  }

  const maxRow = await query<{ next_order: number }[]>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM course_categories",
  );
  const sortOrder = Number(maxRow[0]?.next_order ?? 1);

  await exec(
    `INSERT INTO course_categories (id, slug, name, description, href, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      `category-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      slug,
      name,
      input.description?.trim() || null,
      input.href?.trim() || null,
      sortOrder,
    ],
  );

  return fetchAllCourseCategories();
}

export type CategoryPatch = {
  name?: string;
  slug?: string;
  description?: string | null;
  href?: string | null;
  isActive?: boolean;
};

export async function updateCourseCategory(
  id: string,
  patch: CategoryPatch,
): Promise<CourseCategory[]> {
  await ensureSchema();

  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length === 0 || name.length > 255) {
      throw new Error("Category name is required and must be under 255 characters.");
    }
    sets.push("name = ?");
    values.push(name);
  }
  if (patch.slug !== undefined) {
    const slug = normalizeSlug(patch.slug);
    if (slug.length === 0) {
      throw new Error("Slug must contain at least one letter or number.");
    }
    const clash = await query<{ id: string }[]>(
      "SELECT id FROM course_categories WHERE slug = ? AND id != ? LIMIT 1",
      [slug, id],
    );
    if (clash.length > 0) {
      throw new Error(`A category with slug "${slug}" already exists.`);
    }
    sets.push("slug = ?");
    values.push(slug);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    values.push(patch.description?.trim() || null);
  }
  if (patch.href !== undefined) {
    sets.push("href = ?");
    values.push(patch.href?.trim() || null);
  }
  if (patch.isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(patch.isActive ? 1 : 0);
  }

  if (sets.length > 0) {
    values.push(id);
    await exec(`UPDATE course_categories SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  return fetchAllCourseCategories();
}

/** Replace (or set) a category's image; pass file=null to remove it. */
export async function setCourseCategoryImage(
  id: string,
  file: File | null,
): Promise<CourseCategory[]> {
  await ensureSchema();

  const rows = await query<{ image_storage_path: string | null; image_url: string | null }[]>(
    "SELECT image_storage_path, image_url FROM course_categories WHERE id = ? LIMIT 1",
    [id],
  );
  if (rows.length === 0) {
    throw new Error("Category not found.");
  }
  const previousPath = rows[0].image_storage_path ?? rows[0].image_url;

  if (!file) {
    await exec(
      "UPDATE course_categories SET image_url = NULL, image_storage_path = NULL WHERE id = ?",
      [id],
    );
    await deleteCategoryImage(previousPath);
    return fetchAllCourseCategories();
  }

  const fileError = validateImageFile(file);
  if (fileError) {
    throw new Error(fileError);
  }

  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".png";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const url = await saveFile(
    COURSE_CATEGORIES_STORAGE_DIR,
    fileName,
    await file.arrayBuffer(),
  );

  await exec(
    "UPDATE course_categories SET image_url = ?, image_storage_path = ? WHERE id = ?",
    [url, `${COURSE_CATEGORIES_STORAGE_DIR}/${fileName}`, id],
  );
  await deleteCategoryImage(previousPath);

  return fetchAllCourseCategories();
}

export async function reorderCourseCategories(orderedIds: string[]): Promise<CourseCategory[]> {
  await ensureSchema();
  for (let index = 0; index < orderedIds.length; index += 1) {
    await exec("UPDATE course_categories SET sort_order = ? WHERE id = ?", [
      index + 1,
      orderedIds[index],
    ]);
  }
  return fetchAllCourseCategories();
}

export async function deleteCourseCategory(id: string): Promise<CourseCategory[]> {
  await ensureSchema();
  const rows = await query<{ image_storage_path: string | null; image_url: string | null }[]>(
    "SELECT image_storage_path, image_url FROM course_categories WHERE id = ? LIMIT 1",
    [id],
  );
  await exec("DELETE FROM course_categories WHERE id = ?", [id]);
  if (rows[0]) {
    await deleteCategoryImage(rows[0].image_storage_path ?? rows[0].image_url);
  }
  return fetchAllCourseCategories();
}
