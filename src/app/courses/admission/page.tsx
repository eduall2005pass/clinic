import type { Metadata } from "next";
import Link from "next/link";
import BatchCourseList from "@/components/BatchCourseList";
import { batches, getPublicCourses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Admission Courses",
  description:
    "Browse MediSpark medical admission courses by batch — combined syllabus preparation for the medical entrance race.",
};

export default function AdmissionCoursesPage() {
  const admissionCourses = getPublicCourses().filter(
    (course) => course.category === "Admission",
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
            Admission Courses
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
            Select your batch to see the relevant medical admission course
            lineup.
          </p>
        </header>

        <BatchCourseList batches={batches} courses={admissionCourses} />
      </section>
    </main>
  );
}