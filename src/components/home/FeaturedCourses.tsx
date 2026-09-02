import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import { fetchActiveFeaturedSlugs } from "@/lib/featured-courses";
import { getLiveCourse } from "@/lib/course-catalog";

export default async function FeaturedCourses({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  const slugs = await fetchActiveFeaturedSlugs();
  const featured = (
    await Promise.all(slugs.map((slug) => getLiveCourse(slug)))
  ).filter((course) => course !== undefined);

  // No ★ Featured courses in the Admin Panel → nothing to show.
  if (featured.length === 0) return null;

  return (
    <section id="featured-courses" className="scroll-mt-24 border-t border-ink/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center rounded-2xl border border-ink/10 bg-dark-900 px-6 py-4 shadow-lg shadow-black/10 sm:px-8 sm:py-5">
            <h2 className="text-xl font-extrabold tracking-tight text-heading sm:text-2xl md:text-[28px] leading-tight">
              Start your journey with a featured course
            </h2>
          </div>
        </div>

        <div
          className={`mx-auto mt-12 grid gap-6 ${
            featured.length > 2 ? "max-w-5xl sm:grid-cols-2 lg:grid-cols-3" : "max-w-4xl sm:grid-cols-2"
          }`}
        >
          {featured.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/courses"
            className="inline-block rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-heading transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
          >
            View All Courses
          </Link>
        </div>
      </div>
    </section>
  );
}
