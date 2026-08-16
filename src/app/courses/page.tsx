import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import CourseCard from "@/components/CourseCard";
import { courses, categories } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse MediSpark courses — HSC academic subjects and medical admission preparation.",
};

export default function CoursesPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Courses"
        description="Chapter-based courses across HSC academic subjects and the medical admission syllabus. Lesson content and enrollment will be added step by step."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {categories.map((category) => (
            <span
              key={category}
              className="inline-block rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700"
            >
              {category}
            </span>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
          <p className="font-semibold text-primary-800">
            Course lessons, videos and enrollment are coming soon.
          </p>
          <p className="mt-1 text-sm text-primary-700">
            This is the foundation of the MediSpark course system.
          </p>
        </div>
      </section>
    </main>
  );
}