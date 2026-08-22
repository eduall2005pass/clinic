import { fetchCatalogCourses, type CatalogCourse } from "@/lib/courses-admin";
import {
  courses as staticCourses,
  type Course,
  type CourseStatus,
  type CourseAvailability,
} from "@/lib/courses";

// Live course catalog: reads the MySQL `catalog_courses` table (managed from
// Admin Panel → Courses). Falls back to the static catalog in @/lib/courses
// when the DB is unreachable or the table has no rows yet.

function toCourse(row: CatalogCourse): Course {
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
  };
}

/** All live courses — DB rows when available, static catalog otherwise. */
export async function getLiveCourses(): Promise<Course[]> {
  try {
    const rows = await fetchCatalogCourses();
    if (rows.length > 0) return rows.map(toCourse);
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
