"use client";

import Link from "next/link";

const categories = [
  {
    key: "ssc-academic",
    title: "SSC Academic",
    description: "SSC public exam model tests and mock exams for academic students.",
    href: "/public-exam/ssc-academic",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    key: "hsc-academic",
    title: "HSC Academic",
    description: "HSC public exam model tests and mock exams for academic students.",
    href: "/public-exam/hsc-academic",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        <path d="M8 12h8M8 16h8" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: "medical-admission",
    title: "Medical Admission",
    description: "Medical admission test preparation with model exams and practice tests.",
    href: "/public-exam/medical-admission",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M12 2v4m0 12v4m-7.07-11.07l2.83 2.83m9.9-2.83l-2.83 2.83M4.93 4.93l2.83 2.83m11.32 11.32l2.83 2.83" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9v6M9 12h6" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    key: "varsity-admission",
    title: "Varsity Admission",
    description: "University admission test preparation with model exams and practice tests.",
    href: "/public-exam/varsity-admission",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        <path d="M12 2v20M2 12h20" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
  },
];

export default function PublicExamCategories() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-heading sm:text-4xl">
          Public Exam Categories
        </h1>
        <p className="mt-3 text-lg text-neutral-400 max-w-2xl mx-auto">
          Choose your exam category to access model tests, mock exams, and practice materials.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {categories.map((cat) => (
          <Link
            key={cat.key}
            href={cat.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 p-8 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-600/10 blur-3xl transition duration-300 group-hover:bg-primary-600/20" />
            <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-30" />

            <div className="relative">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500 transition duration-300 group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50">
                {cat.icon}
              </span>
              <h2 className="mt-6 text-2xl font-extrabold text-heading transition duration-300 group-hover:text-primary-400">
                {cat.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {cat.description}
              </p>
            </div>

            <span className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition duration-300 group-hover:bg-primary-700 group-hover:shadow-primary-900/60 active:scale-[0.98]">
              Explore Exams
              <svg
                className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}