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
async function fetchContentCounts(): Promise<{
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
    totalClasses: counts?.classes.get(row.slug),
    totalExams: counts?.exams.get(row.slug),
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
