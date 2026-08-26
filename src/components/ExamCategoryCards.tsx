"use client";

import Link from "next/link";
import type { ExamCategory } from "@/lib/public-exams";

function BookIcon() {
  return (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-.491-6.347m15.482 0a50.636 50.636 0 01.491 6.347m-7.74-11.55A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 0012 20.904" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 3v2m6-2v2M9 19v1a4 4 0 008 0v-1m-12-6a6 6 0 0012 0V7a2 2 0 10-4 0v5a2 2 0 11-4 0V7a2 2 0 10-4 0v6z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  );
}

const categoryCards: {
  key: ExamCategory;
  label: string;
  description: string;
  Icon: () => React.ReactElement;
}[] = [
  {
    key: "ssc-academic",
    label: "SSC Academic Exam",
    description: "Board-style MCQ model tests for SSC students.",
    Icon: BookIcon,
  },
  {
    key: "hsc-academic",
    label: "HSC Academic Exam",
    description: "Full-length HSC academic exam preparation.",
    Icon: GraduationCapIcon,
  },
  {
    key: "medical-admission",
    label: "Medical Admission Exam",
    description: "Medical admission mock tests with negative marking.",
    Icon: StethoscopeIcon,
  },
  {
    key: "varsity-admission",
    label: "University Admission Exam",
    description: "University admission practice by latest patterns.",
    Icon: BuildingIcon,
  },
];

/**
 * Public Exam section — 4 exam-category cards visually identical to the
 * Course Section (CategoryCard) design system: same layout, border radius,
 * spacing, typography, icon treatment, hover effect, button style and
 * responsive behavior. Only the button text differs ("Explore Exam").
 *
 * Exactly 4 categories in fixed order; routing unchanged (`${basePath}/${key}`).
 * `basePath` lets the Admin Panel reuse this exact UI with its own routes
 * (/admin/exams/public/category/…) while students keep /exam/category/….
 */
export default function ExamCategoryCards({
  basePath = "/exam/category",
}: {
  basePath?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Public Exams
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
          Choose Your Exam
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
          Choose your exam category to see live, upcoming and previous exams.
        </p>
      </div>

      {/* 4 cards — same grid as Course Section: gap-6 sm:grid-cols-2 xl:grid-cols-4 */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {categoryCards.map(({ key, label, description, Icon }) => (
          <Link
            key={key}
            href={`${basePath}/${key}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99]"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-600/10 blur-3xl transition duration-300 group-hover:bg-primary-600/20" />
            <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-30" />

            {/* Icon on the left, exam category name beside it — same as CategoryCard */}
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500 transition duration-300 group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50">
                <Icon />
              </span>
              <h3 className="text-lg font-extrabold leading-snug text-heading transition duration-300 group-hover:text-primary-400 sm:text-xl">
                {label}
              </h3>
            </div>

            <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-400">
              {description}
            </p>

            {/* Same button style as CategoryCard — only text differs: Explore Exam */}
            <div className="relative mt-auto pt-6">
              <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition duration-300 group-hover:bg-primary-700 group-hover:shadow-primary-900/60">
                Explore Exam
                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}