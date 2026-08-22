import type { Metadata } from "next";
import Link from "next/link";
import BatchCourseList from "@/components/BatchCourseList";
import { batches } from "@/lib/courses";
import { getLivePublicCourses } from "@/lib/course-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academic Courses",
  description:
    "Browse MediSpark HSC academic courses by batch — Botany, Zoology and Biology Revision with board exam-focused preparation.",
};

export default async function AcademicCoursesPage() {
  const academicCourses = (await getLivePublicCourses()).filter(
    (course) => course.category === "Academic",
  );

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          All Courses
        </Link>

        <header className="mb-10">
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary-500">
            Courses
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading sm:text-4xl">
            Academic Courses
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
            Select your batch to see the relevant HSC academic course lineup.
          </p>
        </header>

        <BatchCourseList batches={batches} courses={academicCourses} />
      </section>
    </main>
  );
}