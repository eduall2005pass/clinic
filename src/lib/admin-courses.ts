import { exec, query } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";

export const ADMIN_COURSES_STORAGE_DIR = "course-images";

const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;
export const MAX_COURSE_IMAGE_SIZE = 5 * 1024 * 1024;

export type AdminCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  price: number;
  discountPrice: number | null;
  duration: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
};

type AdminCourseRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  category: string;
  price: string | number;
  discount_price: string | number | null;
  duration: string | null;
  image_url: string | null;
  is_featured: number | boolean;
  is_published: number | boolean;
};

async function ensureSchema(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS admin_courses (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      slug VARCHAR(191) NOT NULL,
      title VARCHAR(255) NOT NULL,
      short_description TEXT NULL,
      description MEDIUMTEXT NULL,
      category VARCHAR(191) NOT NULL DEFAULT '',
      price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      discount_price DECIMAL(10, 2) NULL,
      duration VARCHAR(191) NULL,
      image_url VARCHAR(1024) NULL,
      image_storage_path VARCHAR(1024) NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      is_published TINYINT(1) NOT NULL DEFAULT 0,
      updated_by VARCHAR(191) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_admin_courses_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

function rowToCourse(row: AdminCourseRow): AdminCourse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description ?? "",
    description: row.description ?? "",
    category: row.category ?? "",
    price: Number(row.price ?? 0),
    discountPrice:
      row.discount_price === null || row.discount_price === undefined
        ? null
        : Number(row.discount_price),
    duration: row.duration ?? null,
    imageUrl: row.image_url ?? null,
    isFeatured: Boolean(row.is_featured),
    isPublished: Boolean(row.is_published),
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

function parsePrice(value: unknown): number {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a non-negative number.");
  }
  return Math.round(price * 100) / 100;
}

function parseDiscount(value: unknown, price: number): number | null {
  if (value === null || value === undefined || value === "" || value === "null") {
    return null;
  }
  const discount = Number(value);
  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error("Discount must be a non-negative number.");
  }
  if (discount >= price) {
    throw new Error("Discount must be smaller than the regular price.");
  }
  return Math.round(discount * 100) / 100;
}

/** All courses (published + unpublished), newest first — used by the Admin Panel. */
export async function fetchAllAdminCourses(): Promise<AdminCourse[]> {
  await ensureSchema();
  const rows = await query<AdminCourseRow[]>(
    `SELECT id, slug, title, short_description, description, category, price,
            discount_price, duration, image_url, is_featured, is_published
     FROM admin_courses ORDER BY created_at DESC`,
  );
  return rows.map(rowToCourse);
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = normalizeSlug(base);
  if (slug.length === 0) slug = `course-${Date.now()}`;
  let candidate = slug;
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const clash = await query<{ id: string }[]>(
      "SELECT id FROM admin_courses WHERE slug = ? LIMIT 1",
      [candidate],
    );
    if (clash.length === 0 || clash[0].id === ignoreId) return candidate;
    candidate = `${slug}-${attempt}`;
  }
  return `${slug}-${Date.now()}`;
}

export type AdminCourseInput = {
  title?: unknown;
  slug?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  category?: unknown;
  price?: unknown;
  discountPrice?: unknown;
  duration?: unknown;
  isFeatured?: unknown;
  isPublished?: unknown;
};

function normalizeInput(raw: Record<string, unknown>) {
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 255) : "";
  if (!title) throw new Error("Course title is required.");
  return {
    title,
    slug:
      typeof raw.slug === "string" && raw.slug.trim()
        ? raw.slug.trim().slice(0, 191)
        : null,
    shortDescription:
      typeof raw.shortDescription === "string"
        ? raw.shortDescription.slice(0, 2000)
        : "",
    description:
      typeof raw.description === "string" ? raw.description.slice(0, 50000) : "",
    category:
      typeof raw.category === "string" && raw.category.trim()
        ? raw.category.trim().slice(0, 191)
        : "",
    price: parsePrice(raw.price),
    discountPrice: parseDiscount(raw.discountPrice, parsePrice(raw.price)),
    duration:
      typeof raw.duration === "string" && raw.duration.trim()
        ? raw.duration.trim().slice(0, 191)
        : null,
    isFeatured:
      raw.isFeatured === true || raw.isFeatured === "true" || raw.isFeatured === "1",
    isPublished:
      raw.isPublished === true ||
      raw.isPublished === "true" ||
      raw.isPublished === "1",
  };
}

export async function createAdminCourse(
  body: Record<string, unknown>,
  adminUid: string,
): Promise<AdminCourse[]> {
  await ensureSchema();
  const input = normalizeInput(body);
  const slug = await uniqueSlug(input.slug || input.title);

  await exec(
    `INSERT INTO admin_courses
       (id, slug, title, short_description, description, category, price,
        discount_price, duration, is_featured, is_published, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      slug,
      input.title,
      input.shortDescription || null,
      input.description || null,
      input.category,
      input.price,
      input.discountPrice,
      input.duration,
      input.isFeatured ? 1 : 0,
      input.isPublished ? 1 : 0,
      adminUid ?? null,
    ],
  );

  return fetchAllAdminCourses();
}

export async function updateAdminCourse(
  id: string,
  body: Record<string, unknown>,
  adminUid: string,
): Promise<AdminCourse[]> {
  await ensureSchema();

  const existing = await query<{ id: string; slug: string }[]>(
    "SELECT id, slug FROM admin_courses WHERE id = ? LIMIT 1",
    [id],
  );
  if (existing.length === 0) throw new Error("Course not found.");

  // Partial updates are allowed (e.g. publish toggle sends only isPublished).
  const hasFullFields =
    body.title !== undefined &&
    body.price !== undefined &&
    body.discountPrice !== undefined;

  if (hasFullFields) {
    const input = normalizeInput(body);
    const slug = await uniqueSlug(input.slug || input.title, id);
    await exec(
      `UPDATE admin_courses SET
         slug = ?, title = ?, short_description = ?, description = ?,
         category = ?, price = ?, discount_price = ?, duration = ?,
         is_featured = ?, updated_by = ?
       WHERE id = ?`,
      [
        slug,
        input.title,
        input.shortDescription || null,
        input.description || null,
        input.category,
        input.price,
        input.discountPrice,
        input.duration,
        input.isFeatured ? 1 : 0,
        adminUid ?? null,
        id,
      ],
    );
    return fetchAllAdminCourses();
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 255);
    if (!title) throw new Error("Course title is required.");
    sets.push("title = ?");
    values.push(title);
  }
  if (body.isPublished !== undefined) {
    sets.push("is_published = ?");
    values.push(
      body.isPublished === true || body.isPublished === "true" ||
        body.isPublished === "1"
        ? 1
        : 0,
    );
  }
  if (body.isFeatured !== undefined) {
    sets.push("is_featured = ?");
    values.push(
      body.isFeatured === true || body.isFeatured === "true" ||
        body.isFeatured === "1"
        ? 1
        : 0,
    );
  }

  if (sets.length > 0) {
    sets.push("updated_by = ?");
    values.push(adminUid ?? null);
    values.push(id);
    await exec(`UPDATE admin_courses SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  return fetchAllAdminCourses();
}

export async function setAdminCourseImage(
  id: string,
  file: File,
): Promise<AdminCourse[]> {
  await ensureSchema();

  const extension = file.name.includes(".")
    ? `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
    : "";
  if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new Error("Unsupported image type. Use PNG, JPG, WebP or GIF.");
  }
  if (file.size > MAX_COURSE_IMAGE_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const rows = await query<{
    image_storage_path: string | null;
    image_url: string | null;
  }[]>("SELECT image_storage_path, image_url FROM admin_courses WHERE id = ? LIMIT 1", [
    id,
  ]);
  if (rows.length === 0) throw new Error("Course not found.");
  const previousPath = rows[0].image_storage_path ?? rows[0].image_url;

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const url = await saveFile(
    ADMIN_COURSES_STORAGE_DIR,
    fileName,
    await file.arrayBuffer(),
  );

  await exec(
    "UPDATE admin_courses SET image_url = ?, image_storage_path = ? WHERE id = ?",
    [url, url, id],
  );

  if (typeof previousPath === "string" && isLocalUpload(previousPath)) {
    try {
      await removeFile(previousPath);
    } catch {
      // Best-effort cleanup.
    }
  } else if (
    typeof previousPath === "string" &&
    previousPath.includes(ADMIN_COURSES_STORAGE_DIR)
  ) {
    // Fallback for legacy relative paths that isLocalUpload might miss
    try {
      await removeFile(previousPath);
    } catch {
      // Best-effort cleanup.
    }
  }

  return fetchAllAdminCourses();
}

export async function deleteAdminCourse(id: string): Promise<AdminCourse[]> {
  await ensureSchema();
  const rows = await query<{
    image_storage_path: string | null;
    image_url: string | null;
  }[]>("SELECT image_storage_path, image_url FROM admin_courses WHERE id = ? LIMIT 1", [
    id,
  ]);
  await exec("DELETE FROM admin_courses WHERE id = ?", [id]);

  const storagePath = rows[0]?.image_storage_path ?? rows[0]?.image_url;
  if (typeof storagePath === "string" && isLocalUpload(storagePath)) {
    try {
      await removeFile(storagePath);
    } catch {
      // Best-effort cleanup.
    }
  } else if (
    typeof storagePath === "string" &&
    storagePath.includes(ADMIN_COURSES_STORAGE_DIR)
  ) {
    try {
      await removeFile(storagePath);
    } catch {
      // Best-effort cleanup.
    }
  }

  return fetchAllAdminCourses();
}
