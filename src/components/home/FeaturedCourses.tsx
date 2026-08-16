import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import SectionHeader from "@/components/SectionHeader";
import { getFeaturedCourses } from "@/lib/courses";

export default function FeaturedCourses() {
  const featured = getFeaturedCourses().slice(0, 2);

  return (
    <section className="border-t border-white/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Featured Courses"
          title="Start with a featured course"
          description="Two popular courses to begin your preparation — more will be added step by step."
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          {featured.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/courses"
            className="inline-block rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
          >
            View All Courses
          </Link>
        </div>
      </div>
    </section>
  );
}