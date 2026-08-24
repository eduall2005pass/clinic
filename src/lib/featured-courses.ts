import { exec, query } from "@/lib/mysql";
import { getFeaturedCourses } from "@/lib/courses";

// Featured Course system — SINGLE SOURCE OF TRUTH:
// `catalog_courses.is_featured`, toggled from Admin Panel → Courses
// (CourseManager star) and mirrored by Admin → Marketing → Featured Courses.
// The home page Featured Courses section AND the hero sliding banner both
// read this flag automatically — no second manual step anywhere.

export type FeaturedCourseRecord = {
  courseSlug: string;
  isActive: boolean;
};

type CatalogSlugRow = {
  slug: string;
};

async function ensureLegacyTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS featured_courses (
        course_slug VARCHAR(50) NOT NULL PRIMARY KEY,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        updated_by VARCHAR(191) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

/**
 * One-time migration: copy the legacy `featured_courses` selection into
 * `catalog_courses.is_featured` so older databases keep their existing
 * featured courses. After this the flag column is the only source.
 */
async function migrateLegacySelection(): Promise<void> {
  try {
    await query(
      `UPDATE catalog_courses cc
       JOIN featured_courses fc ON fc.course_slug = cc.slug AND fc.is_active = 1
       SET cc.is_featured = 1`,
    );
    await exec("DELETE FROM featured_courses");
  } catch {
    // Legacy table may not exist yet or DB not configured — safe to ignore.
  }
}

function defaultSlugs(): string[] {
  // No admin selection yet and no DB — keep the "latest batch" behaviour.
  return getFeaturedCourses()
    .slice(0, 2)
    .map((course) => course.slug);
}

/** All featured records (flag on), ordered — Admin Panel list. */
export async function fetchAllFeaturedCourses(): Promise<
  FeaturedCourseRecord[]
> {
  try {
    await ensureLegacyTable();
    await migrateLegacySelection();
    const rows = await query<CatalogSlugRow[]>(
      `SELECT slug FROM catalog_courses WHERE is_featured = 1
       ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map((row) => ({ courseSlug: row.slug, isActive: true }));
  } catch {
    // DB unreachable only — never fake a selection when the admin
    // deliberately has no featured courses.
    return getFeaturedCourses()
      .slice(0, 2)
      .map((course) => ({ courseSlug: course.slug, isActive: true }));
  }
}

/**
 * Active featured slugs (published + available catalog courses only),
 * ordered — homepage Featured section and hero banner slides.
 */
export async function fetchActiveFeaturedSlugs(): Promise<string[]> {
  try {
    await ensureLegacyTable();
    await migrateLegacySelection();
    const rows = await query<CatalogSlugRow[]>(
      `SELECT slug FROM catalog_courses
       WHERE is_featured = 1 AND status = 'published' AND availability = 'available'
       ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map((row) => row.slug);
  } catch {
    // DB unreachable only — fall back to the static catalog.
    return defaultSlugs();
  }
}

export type FeaturedCourseInput = {
  slug?: unknown;
  isActive?: unknown;
};

/**
 * Replace the full featured selection in ONE place: flips
 * `catalog_courses.is_featured`. Rows missing from the list are un-featured;
 * unknown slugs are ignored. Order is stored via sort_order so the admin's
 * ordering here matches the homepage/banner order.
 */
export async function saveFeaturedCourses(
  items: Array<Record<string, unknown>>,
  _adminUid: string,
): Promise<FeaturedCourseRecord[]> {
  const slugs: string[] = [];
  for (const raw of items) {
    if (typeof raw?.slug !== "string") continue;
    const isActive =
      raw.isActive === true || raw.isActive === "true" || raw.isActive === "1";
    if (!isActive) continue; // Only active rows keep the flag turned on.
    slugs.push(raw.slug);
  }

  // Reset everything, then mark the selected slugs (parameterised IN clause).
  await exec("UPDATE catalog_courses SET is_featured = 0");
  for (let index = 0; index < slugs.length; index += 1) {
    await exec(
      `UPDATE catalog_courses SET is_featured = 1, sort_order = ? WHERE slug = ?`,
      [index + 1, slugs[index]],
    );
  }

  return fetchAllFeaturedCourses();
}
