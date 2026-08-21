import { exec, query } from "@/lib/mysql";
import { getFeaturedCourses, getCourse } from "@/lib/courses";

export type FeaturedCourseRecord = {
  courseSlug: string;
  isActive: boolean;
};

type FeaturedCourseRow = {
  course_slug: string;
  is_active: number | boolean;
};

async function ensureFeaturedCoursesTable(): Promise<void> {
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

function defaultRecords(): FeaturedCourseRecord[] {
  // No admin selection yet — keep the current "latest batch" behaviour.
  return getFeaturedCourses()
    .slice(0, 2)
    .map((course) => ({ courseSlug: course.slug, isActive: true }));
}

/** All featured-course records (including disabled), ordered — Admin Panel. */
export async function fetchAllFeaturedCourses(): Promise<
  FeaturedCourseRecord[]
> {
  try {
    await ensureFeaturedCoursesTable();
    const rows = await query<FeaturedCourseRow[]>(
      `SELECT course_slug, is_active
       FROM featured_courses ORDER BY sort_order ASC`,
    );
    if (!rows || rows.length === 0) return defaultRecords();
    return rows.map((row) => ({
      courseSlug: row.course_slug,
      isActive: Boolean(row.is_active),
    }));
  } catch {
    return defaultRecords();
  }
}

/** Active featured slugs (published catalog courses only), ordered — homepage. */
export async function fetchActiveFeaturedSlugs(): Promise<string[]> {
  try {
    await ensureFeaturedCoursesTable();
    const rows = await query<FeaturedCourseRow[]>(
      `SELECT course_slug, is_active
       FROM featured_courses WHERE is_active = 1 ORDER BY sort_order ASC`,
    );
    const slugs = rows
      .map((row) => row.course_slug)
      .filter((slug) => {
        const course = getCourse(slug);
        return (
          course !== undefined &&
          course.status === "published" &&
          course.availability === "available"
        );
      });
    return slugs;
  } catch {
    return defaultRecords().map((record) => record.courseSlug);
  }
}

export type FeaturedCourseInput = {
  slug?: unknown;
  isActive?: unknown;
};

/**
 * Replace the full featured list (handles select / deselect / toggle /
 * reorder in one shot). Rows missing from the list are removed. Unknown
 * catalog slugs are ignored.
 */
export async function saveFeaturedCourses(
  items: Array<Record<string, unknown>>,
  adminUid: string,
): Promise<FeaturedCourseRecord[]> {
  await ensureFeaturedCoursesTable();

  const normalized: FeaturedCourseRecord[] = [];
  for (const raw of items) {
    if (typeof raw.slug !== "string") continue;
    const course = getCourse(raw.slug);
    if (!course) continue;
    normalized.push({
      courseSlug: course.slug,
      isActive:
        raw.isActive === true || raw.isActive === "true" || raw.isActive === "1",
    });
  }

  for (let index = 0; index < normalized.length; index += 1) {
    const record = normalized[index];
    await query(
      `INSERT INTO featured_courses (course_slug, is_active, sort_order, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order),
         updated_by = VALUES(updated_by)`,
      [record.courseSlug, record.isActive ? 1 : 0, index + 1, adminUid ?? null],
    );
  }

  if (normalized.length > 0) {
    const placeholders = normalized.map(() => "?").join(", ");
    await exec(
      `DELETE FROM featured_courses WHERE course_slug NOT IN (${placeholders})`,
      normalized.map((record) => record.courseSlug),
    );
  } else {
    await exec("DELETE FROM featured_courses");
  }

  return fetchAllFeaturedCourses();
}
