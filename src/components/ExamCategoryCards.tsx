"use client";

import Link from "next/link";
import type { ExamCategory } from "@/lib/public-exams";

function BookIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-.491-6.347m15.482 0a50.636 50.636 0 01.491 6.347m-7.74-11.55A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 0012 20.904" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v1a4 4 0 008 0v-1m-12-6a6 6 0 0012 0V7a2 2 0 10-4 0v5a2 2 0 11-4 0V7a2 2 0 10-4 0v6z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
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
    label: "SSC Academic",
    description: "Board-style MCQ model tests for SSC students.",
    Icon: BookIcon,
  },
  {
    key: "hsc-academic",
    label: "HSC Academic",
    description: "Full-length HSC academic exam preparation.",
    Icon: GraduationCapIcon,
  },
  {
    key: "medical-admission",
    label: "Medical Admission",
    description: "Medical admission mock tests with negative marking.",
    Icon: StethoscopeIcon,
  },
  {
    key: "varsity-admission",
    label: "Varsity Admission",
    description: "University admission practice by latest patterns.",
    Icon: BuildingIcon,
  },
];

/**
 * The Public Exam section entry point — exactly 4 separate course-category
 * cards stacked vertically (1 card per row on every screen size), icon on
 * the left with the category name beside it. Clicking a card opens that
 * category's own Public Exams page. Not tabs, not a dropdown.
 */
export default function ExamCategoryCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Public Exams
          </h2>
          <p className="mt-1 text-sm text-neutral-400">
            Choose your exam category to see live, upcoming and previous exams.
          </p>
        </div>
      </div>

      {/* Exactly 4 cards — vertical stack, 1 per row, equal height & width. */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {categoryCards.map(({ key, label, Icon }) => (
          <Link
            key={key}
            href={`/exam/category/${key}`}
            className="group flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-3.5 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99] sm:gap-4 sm:p-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-300 transition duration-300 group-hover:bg-primary-600 group-hover:text-white sm:h-13 sm:w-13">
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold leading-snug text-heading transition group-hover:text-primary-400 sm:text-base">
                {label}
              </h3>
              <p className="mt-0.5 truncate text-xs text-neutral-500 sm:text-sm">
                Live · Upcoming · Previous Exams
              </p>
            </span>
            <svg
              className="h-4 w-4 shrink-0 text-neutral-500 transition duration-300 group-hover:translate-x-1 group-hover:text-primary-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}