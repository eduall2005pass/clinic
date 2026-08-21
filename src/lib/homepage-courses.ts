import { query, parseDate } from "@/lib/mysql";
import { saveFile, removeFile, isLocalUpload } from "@/lib/storage";
import { fetchAdminAccount } from "@/lib/admin";
import {
  HOMEPAGE_COURSE_DEFAULTS,
  HOMEPAGE_COURSE_SLUGS,
  HOMEPAGE_COURSES_STORAGE_DIR,
  ALLOWED_HOMEPAGE_COURSE_EXTENSIONS,
  MAX_HOMEPAGE_COURSE_IMAGE_SIZE,
  type HomepageCourseCard,
  type HomepageCourseSlug,
} from "@/lib/homepage-courses-constants";

type HomepageCoursesRow = {
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_storage_path: string | null;
  image_file_name: string | null;
  button_text: string | null;
  button_href: string | null;
  is_active: number | boolean;
  sort_order: number;
  updated_at: Date | string | null;
  updated_by: string | null;
};

function mapRow(row: HomepageCoursesRow, displayName: string | null): HomepageCourseCard {
  const slug = row.slug as HomepageCourseSlug;
  const fallback = HOMEPAGE_COURSE_DEFAULTS[slug] ?? HOMEPAGE_COURSE_DEFAULTS.ssc;
  return {
    slug,
    title: row.title ?? fallback.title,
    description: row.description ?? fallback.description,
    imageUrl: row.image_url ?? null,
    imageFileName: row.image_file_name ?? null,
    buttonText: row.button_text ?? fallback.buttonText,
    buttonHref: row.button_href ?? fallback.buttonHref,
    isActive: Boolean(row.is_active),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : fallback.sortOrder,
    updatedAt: row.updated_at ? parseDate(row.updated_at) : null,
    updatedBy: displayName ?? row.updated_by ?? null,
  };
}

export async function fetchHomepageCourses(): Promise<HomepageCourseCard[]> {
  try {
    const rows = await query<HomepageCoursesRow[]>(
      `SELECT slug, title, description, image_url, image_storage_path, image_file_name,
              button_text, button_href, is_active, sort_order, updated_at, updated_by
       FROM homepage_courses ORDER BY sort_order ASC, slug ASC`,
    );
    if (!rows || rows.length === 0) {
      return HOMEPAGE_COURSE_SLUGS.map((slug) => HOMEPAGE_COURSE_DEFAULTS[slug]);
    }
    const cards: HomepageCourseCard[] = [];
    for (const row of rows) {
      const displayName = row.updated_by ? (await fetchAdminAccount(row.updated_by))?.displayName ?? null : null;
      // fallback to email if no displayName
      let finalDisplay = displayName;
      if (!finalDisplay && row.updated_by) {
        const acc = await fetchAdminAccount(row.updated_by);
        finalDisplay = acc?.email ?? row.updated_by;
      }
      cards.push(mapRow(row, finalDisplay));
    }
    // Ensure all 3 slugs are present even if DB missing one
    const existingSlugs = new Set(cards.map((c) => c.slug));
    for (const slug of HOMEPAGE_COURSE_SLUGS) {
      if (!existingSlugs.has(slug)) {
        cards.push(HOMEPAGE_COURSE_DEFAULTS[slug]);
      }
    }
    // sort by sort_order
    cards.sort((a, b) => a.sortOrder - b.sortOrder);
    return cards;
  } catch {
    return HOMEPAGE_COURSE_SLUGS.map((slug) => HOMEPAGE_COURSE_DEFAULTS[slug]);
  }
}

export async function fetchActiveHomepageCourses(): Promise<HomepageCourseCard[]> {
  const all = await fetchHomepageCourses();
  return all.filter((c) => c.isActive);
}

export async function fetchHomepageCourseBySlug(slug: HomepageCourseSlug): Promise<HomepageCourseCard | null> {
  const all = await fetchHomepageCourses();
  return all.find((c) => c.slug === slug) ?? null;
}

type SaveInput = {
  slug: HomepageCourseSlug;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  isActive?: boolean;
};

export async function saveHomepageCourse(
  input: SaveInput,
  imageFile: File | null,
  adminUid: string,
): Promise<HomepageCourseCard> {
  if (!HOMEPAGE_COURSE_SLUGS.includes(input.slug as HomepageCourseSlug)) {
    throw new Error("Invalid course category.");
  }

  // Fetch existing row to preserve fields and handle image cleanup
  let existing: HomepageCoursesRow | null = null;
  try {
    const rows = await query<HomepageCoursesRow[]>(
      `SELECT slug, title, description, image_url, image_storage_path, image_file_name,
              button_text, button_href, is_active, sort_order, updated_at, updated_by
       FROM homepage_courses WHERE slug = ? LIMIT 1`,
      [input.slug],
    );
    existing = rows[0] ?? null;
  } catch {
    existing = null;
  }

  const title = input.title !== undefined ? input.title.trim() : (existing?.title ?? HOMEPAGE_COURSE_DEFAULTS[input.slug].title);
  const description = input.description !== undefined ? input.description.trim() : (existing?.description ?? HOMEPAGE_COURSE_DEFAULTS[input.slug].description);
  const buttonText = input.buttonText !== undefined ? input.buttonText.trim() || "Explore Courses" : (existing?.button_text ?? HOMEPAGE_COURSE_DEFAULTS[input.slug].buttonText);
  const buttonHref = input.buttonHref !== undefined ? input.buttonHref.trim() || HOMEPAGE_COURSE_DEFAULTS[input.slug].buttonHref : (existing?.button_href ?? HOMEPAGE_COURSE_DEFAULTS[input.slug].buttonHref);
  const isActive = input.isActive !== undefined ? input.isActive : (existing ? Boolean(existing.is_active) : true);

  if (title.length === 0 || title.length > 255) {
    throw new Error("Title is required and must be under 255 characters.");
  }
  if (description.length > 1000) {
    throw new Error("Description must be under 1000 characters.");
  }
  if (buttonText.length === 0 || buttonText.length > 100) {
    throw new Error("Button text is required and must be under 100 characters.");
  }
  if (buttonHref.length === 0 || buttonHref.length > 1024) {
    throw new Error("Button link is required and must be under 1024 characters.");
  }
  if (!buttonHref.startsWith("/") && !isValidHttpUrl(buttonHref)) {
    throw new Error("Button link must be a valid URL (https://...) or an internal path (/...).");
  }

  let imageUrl: string | null = existing?.image_url ?? null;
  let imageStoragePath: string | null = existing?.image_storage_path ?? null;
  let imageFileName: string | null = existing?.image_file_name ?? null;
  let previousImagePath: string | null = null;

  if (imageFile) {
    const extension = imageFile.name.includes(".")
      ? `.${imageFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!(ALLOWED_HOMEPAGE_COURSE_EXTENSIONS as readonly string[]).includes(extension as never)) {
      throw new Error("Unsupported image type. Use PNG, JPG, WebP, GIF or SVG.");
    }
    if (imageFile.size > MAX_HOMEPAGE_COURSE_IMAGE_SIZE) {
      throw new Error("Image must be 5 MB or smaller.");
    }
    const fileName = `${input.slug}-${Date.now()}${extension}`;
    const url = await saveFile(HOMEPAGE_COURSES_STORAGE_DIR, fileName, await imageFile.arrayBuffer());
    const newStoragePath = `${HOMEPAGE_COURSES_STORAGE_DIR}/${fileName}`;
    if (typeof imageStoragePath === "string" && isLocalUpload(imageStoragePath)) {
      previousImagePath = imageStoragePath;
    } else if (typeof imageUrl === "string" && isLocalUpload(imageUrl)) {
      previousImagePath = imageUrl;
    }
    imageUrl = url;
    imageStoragePath = newStoragePath;
    imageFileName = imageFile.name;
  }

  const sortOrder = existing?.sort_order ?? HOMEPAGE_COURSE_DEFAULTS[input.slug].sortOrder;

  await query(
    `INSERT INTO homepage_courses
      (slug, title, description, image_url, image_storage_path, image_file_name, button_text, button_href, is_active, sort_order, updated_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       image_url = VALUES(image_url),
       image_storage_path = VALUES(image_storage_path),
       image_file_name = VALUES(image_file_name),
       button_text = VALUES(button_text),
       button_href = VALUES(button_href),
       is_active = VALUES(is_active),
       sort_order = VALUES(sort_order),
       updated_by = VALUES(updated_by)`,
    [input.slug, title, description || null, imageUrl, imageStoragePath, imageFileName, buttonText, buttonHref, isActive ? 1 : 0, sortOrder, adminUid],
  );

  if (previousImagePath) {
    await removeFile(previousImagePath);
  }

  const account = await fetchAdminAccount(adminUid);
  const displayName = account?.displayName ?? account?.email ?? adminUid;

  return {
    slug: input.slug,
    title,
    description,
    imageUrl,
    imageFileName,
    buttonText,
    buttonHref,
    isActive,
    sortOrder,
    updatedAt: new Date().toISOString(),
    updatedBy: displayName,
  };
}

export async function removeHomepageCourseImage(slug: HomepageCourseSlug, adminUid: string): Promise<HomepageCourseCard> {
  if (!HOMEPAGE_COURSE_SLUGS.includes(slug)) {
    throw new Error("Invalid course category.");
  }
  let existing: HomepageCoursesRow | null = null;
  try {
    const rows = await query<HomepageCoursesRow[]>(
      `SELECT slug, title, description, image_url, image_storage_path, image_file_name,
              button_text, button_href, is_active, sort_order, updated_at, updated_by
       FROM homepage_courses WHERE slug = ? LIMIT 1`,
      [slug],
    );
    existing = rows[0] ?? null;
  } catch {
    existing = null;
  }
  if (!existing) {
    throw new Error("Course card not found.");
  }
  const storagePath = existing.image_storage_path ?? existing.image_url ?? null;
  await query(
    `UPDATE homepage_courses SET image_url = NULL, image_storage_path = NULL, image_file_name = NULL, updated_by = ?, updated_at = NOW() WHERE slug = ?`,
    [adminUid, slug],
  );
  if (typeof storagePath === "string" && isLocalUpload(storagePath)) {
    await removeFile(storagePath);
  }
  const account = await fetchAdminAccount(adminUid);
  const displayName = account?.displayName ?? account?.email ?? adminUid;
  return {
    slug,
    title: existing.title,
    description: existing.description ?? "",
    imageUrl: null,
    imageFileName: null,
    buttonText: existing.button_text ?? HOMEPAGE_COURSE_DEFAULTS[slug].buttonText,
    buttonHref: existing.button_href ?? HOMEPAGE_COURSE_DEFAULTS[slug].buttonHref,
    isActive: Boolean(existing.is_active),
    sortOrder: existing.sort_order,
    updatedAt: new Date().toISOString(),
    updatedBy: displayName,
  };
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
