import { NextResponse } from "next/server";
import { fetchActiveFeaturedSlugs } from "@/lib/featured-courses";
import { getLiveCourse } from "@/lib/course-catalog";
import { getPayableFee, formatFee } from "@/lib/courses";
import { fetchFeaturedPublicExams } from "@/lib/exams-admin";
import { fetchFeaturedJerseys } from "@/lib/content-admin";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 300;

/**
 * Auto-generated slides for the hero sliding banner:
 *  1. courses marked ★ Featured in the Admin Panel,
 *  2. public exams marked ★ Featured in Public Exam Control.
 *  3. jerseys marked ★ Featured in Jersey Control.
 * No manual banner upload needed — when the admin toggles Featured, these
 * appear/disappear automatically.
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

  // Featured PUBLIC EXAMS → homepage slider slides (published only).
  try {
    const featuredExams = await fetchFeaturedPublicExams();
    const examSlides = featuredExams.map((exam) => ({
      id: `public-exam-${exam.id}`,
      image: exam.bannerUrl || "/banners/public-exam.svg",
      href: `/exam/${exam.id}`,
      title: exam.title,
      subtitle: "Public Exam",
    }));
    slides.push(...examSlides);
  } catch {
    // Featured exams are optional — never break the banner API.
  }

  // Featured JERSEYS → homepage slider slides.
  try {
    const featuredJerseys = await fetchFeaturedJerseys();
    const jerseySlides = featuredJerseys.map((jersey) => ({
      id: `jersey-${jersey.id}`,
      image: jersey.image || "/banners/jersey-of-medispark.svg",
      href: jersey.link || "#jerseys",
      title: jersey.name,
      subtitle: jersey.price > 0 ? `৳${jersey.price}` : "Jersey",
    }));
    slides.push(...jerseySlides);
  } catch {
    // Featured jerseys are optional — never break the banner API.
  }

  return NextResponse.json(
    { slides },
    { headers: { "Cache-Control": "no-store" } },
  );
}
