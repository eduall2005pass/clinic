import { fetchCatalogCourses, type CatalogCourse } from "@/lib/courses-admin";
import { query } from "@/lib/mysql";
import {
  courses as staticCourses,
  type Course,
  type CourseStatus,
  type CourseAvailability,
} from "@/lib/courses";

// Live course catalog: reads the MySQL `catalog_courses` table (managed from
// Admin Panel → Courses). Falls back to the static catalog in @/lib/courses
// when the DB is unreachable or the table has no rows yet.

/** Class/exam totals per course from the live learning tables. */
export async function fetchContentCounts(): Promise<{
  classes: Map<string, number>;
  exams: Map<string, number>;
}> {
  const classes = new Map<string, number>();
  const exams = new Map<string, number>();
  try {
    const classRows = await query<{ course_slug: string; cnt: string | number }[]>(
      `SELECT a.course_slug, COUNT(cl.id) AS cnt
         FROM course_subject_assignments a
         JOIN course_chapters ch ON ch.subject_id = a.subject_id AND ch.is_active = 1
         JOIN course_classes cl ON cl.chapter_id = ch.id AND cl.is_active = 1
        GROUP BY a.course_slug`,
    );
    for (const row of classRows) classes.set(row.course_slug, Number(row.cnt) || 0);

    const examRows = await query<{ course_slug: string; cnt: string | number }[]>(
      `SELECT a.course_slug, COUNT(ex.id) AS cnt
         FROM course_subject_assignments a
         JOIN course_chapters ch ON ch.subject_id = a.subject_id AND ch.is_active = 1
         JOIN exams ex ON ex.chapter_id = ch.id AND ex.status = 'published'
        GROUP BY a.course_slug`,
    );
    for (const row of examRows) exams.set(row.course_slug, Number(row.cnt) || 0);
  } catch {
    // Counts are optional — missing tables simply hide the stats on cards.
  }
  return { classes, exams };
}

function toCourse(
  row: CatalogCourse,
  counts?: { classes: Map<string, number>; exams: Map<string, number> },
): Course {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    batchId: row.batchId,
    image: row.image ?? "/courses/biology.svg",
    shortDescription: row.shortDescription ?? "",
    description: row.description ?? "",
    teacherName: row.teacherName,
    teacherPhoto: row.teacherPhoto ?? "/avatars/teacher.svg",
    designation: row.designation,
    duration: row.duration,
    fee: row.fee,
    discountFee: row.discountFee,
    features: row.features,
    overviewTitle: row.overviewTitle,
    overview: row.overview,
    status: (row.status === "published" ? "published" : "unpublished") as CourseStatus,
    availability: (row.availability === "hidden" ? "hidden" : "available") as CourseAvailability,
    couponEnabled: row.couponEnabled,
    totalClasses: row.totalClasses ?? counts?.classes.get(row.slug),
    totalExams: row.totalExams ?? counts?.exams.get(row.slug),
    courseDetails: row.courseDetails,
    routineUrls: row.routineUrls ?? [],
  };
}

/** All live courses — DB rows when available, static catalog otherwise. */
export async function getLiveCourses(): Promise<Course[]> {
  try {
    const rows = await fetchCatalogCourses();
    if (rows.length > 0) {
      const counts = await fetchContentCounts();
      return rows.map((row) => toCourse(row, counts));
    }
  } catch {
    // fall through to static
  }
  return staticCourses;
}

/** Published + available courses for the public site. */
export async function getLivePublicCourses(): Promise<Course[]> {
  return (await getLiveCourses()).filter(
    (course) => course.status === "published" && course.availability === "available",
  );
}

export async function getLiveCourse(slug: string): Promise<Course | undefined> {
  const all = await getLiveCourses();
  return all.find((course) => course.slug === slug);
}

/** Latest-batch featured courses (mirrors getFeaturedCourses). */
export async function getLiveFeaturedCourses(): Promise<Course[]> {
  const publicCourses = await getLivePublicCourses();
  if (publicCourses.length === 0) return [];
  const latestBatch = publicCourses[0].batchId;
  const latest = publicCourses.filter((course) => course.batchId === latestBatch);
  return latest.length > 0 ? latest : publicCourses;
}

/**
 * Course count per Course Control category — used by the 4 category cards
 * on /courses. Counts ONLY published + available courses that belong to
 * each category via category_id (fallback to category name for legacy rows).
 * Returns 0 for categories with no available courses.
 */
export async function fetchCourseCategoryCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  try {
    const { fetchActiveCourseCategories } = await import(
      "@/lib/course-categories-store"
    );
    const categories = await fetchActiveCourseCategories();
    for (const cat of categories) counts[cat.id] = 0;
    // Also prepare slug → id map for fallback matching.
    const slugToId = new Map<string, string>();
    const nameTokenToId = new Map<string, string>();
    for (const cat of categories) {
      slugToId.set(cat.slug.toLowerCase(), cat.id);
      nameTokenToId.set(cat.name.toLowerCase().replace(/[^a-z0-9]+/g, ""), cat.id);
    }

    // Use raw catalog rows to respect category_id linkage directly.
    const { fetchCatalogCourses } = await import("@/lib/courses-admin");
    let rows: Awaited<ReturnType<typeof fetchCatalogCourses>> = [];
    try {
      rows = await fetchCatalogCourses();
    } catch {
      rows = [];
    }

    // If DB has no rows, fall back to static catalog counts via name mapping.
    if (rows.length === 0) {
      const publicCourses = await getLivePublicCourses();
      for (const course of publicCourses) {
        const token = course.category.toLowerCase().replace(/[^a-z0-9]+/g, "");
        // Try direct name token match, then slug prefix.
        let targetId: string | undefined;
        if (nameTokenToId.has(token)) targetId = nameTokenToId.get(token);
        else {
          for (const [slug, id] of slugToId) {
            if (token.startsWith(slug) || slug.startsWith(token.slice(0, 3))) {
              targetId = id;
              break;
            }
          }
        }
        if (targetId && counts[targetId] !== undefined) counts[targetId] += 1;
      }
      return counts;
    }

    for (const row of rows) {
      if (row.status !== "published") continue;
      if (row.availability === "hidden") continue;
      let targetId: string | null = row.categoryId ?? null;
      if (targetId && counts[targetId] === undefined) {
        // Stale id (category deleted) — try fallback via name.
        targetId = null;
      }
      if (!targetId) {
        const token = row.category.toLowerCase().replace(/[^a-z0-9]+/g, "");
        if (nameTokenToId.has(token)) targetId = nameTokenToId.get(token)!;
        else {
          for (const [slug, id] of slugToId) {
            if (token.startsWith(slug)) {
              targetId = id;
              break;
            }
          }
        }
      }
      if (targetId && counts[targetId] !== undefined) counts[targetId] += 1;
    }
  } catch {
    // On DB errors return zero counts — cards still render.
  }
  return counts;
}
