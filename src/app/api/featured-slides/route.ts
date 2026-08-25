import { NextResponse } from "next/server";
import { fetchActiveFeaturedSlugs } from "@/lib/featured-courses";
import { getLiveCourse } from "@/lib/course-catalog";
import { getPayableFee, formatFee } from "@/lib/courses";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

/**
 * Auto-generated slides for the hero sliding banner from courses marked
 * ★ Featured in the Admin Panel. No manual banner upload needed — when the
 * admin toggles Featured, these appear/disappear automatically.
 */
export async function GET() {
  const slugs = await fetchActiveFeaturedSlugs();
  const courses = (
    await Promise.all(slugs.map((slug) => getLiveCourse(slug)))
  ).filter((course) => course !== undefined);

  const slides = courses.map((course) => {
    const payable = getPayableFee(course);
    return {
      id: `featured-${course.slug}`,
      image: course.image,
      href: `/courses/${course.slug}`,
      title: course.name,
      subtitle:
        course.fee > 0
          ? `${course.category} · ${formatFee(payable)}`
          : course.category,
    };
  });

  return NextResponse.json(
    { slides },
    { headers: { "Cache-Control": "no-store" } },
  );
}
