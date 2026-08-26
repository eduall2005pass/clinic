"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CategoryCard from "@/components/CategoryCard";
import BatchCourseList from "@/components/BatchCourseList";
import {
  batchFilterOptions,
  getPayableFee,
  type BatchFilterOption,
  type Course,
} from "@/lib/courses";

type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  href: string | null;
};

const CATEGORY_TYPES = {
  ssc: "SSC Academic",
  hsc: "HSC Academic",
  medical: "Medical Admission",
  varsity: "Varsity Admission",
} as const;

type CategoryParam = keyof typeof CATEGORY_TYPES;

const iconProps = {
  className: "h-8 w-8",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const CATEGORY_ICONS: Record<CategoryParam, React.ReactNode> = {
  ssc: (
    <svg {...iconProps}>
      <path d="M14 22v-4a2 2 0 1 0-4 0v4" />
      <path d="m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10" />
      <path d="M18 5v17" />
      <path d="m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6" />
      <path d="M6 5v17" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  ),
  hsc: (
    <svg {...iconProps}>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  ),
  medical: (
    <svg {...iconProps}>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
  varsity: (
    <svg {...iconProps}>
      <line x1="3" x2="21" y1="22" y2="22" />
      <line x1="6" x2="6" y1="18" y2="11" />
      <line x1="10" x2="10" y1="18" y2="11" />
      <line x1="14" x2="14" y1="18" y2="11" />
      <line x1="18" x2="18" y1="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </svg>
  ),
};

/** Icon per category slug — used when a DB category has no image. */
function iconForSlug(slug: string): React.ReactNode {
  const key = (Object.keys(CATEGORY_ICONS) as CategoryParam[]).find((param) =>
    slug.toLowerCase().includes(param),
  );
  return CATEGORY_ICONS[key ?? "hsc"];
}

function BackToAllCourses() {
  return (
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
  );
}

function CoursesViewInner({
  courses,
  categories,
  sscFilterOptions,
  hscFilterOptions,
}: {
  courses: Course[];
  categories: CategoryRecord[];
  sscFilterOptions?: BatchFilterOption[];
  hscFilterOptions?: BatchFilterOption[];
}) {
  // DB-managed filters (Admin -> Course Control -> Filter) with built-in fallback.
  const optionsFor = (scope: "ssc" | "hsc") =>
    (scope === "ssc" ? sscFilterOptions : hscFilterOptions)?.length
      ? scope === "ssc"
        ? sscFilterOptions!
        : hscFilterOptions!
      : batchFilterOptions[scope];
  const searchParams = useSearchParams();
  const category = searchParams.get("category")?.toLowerCase();
  const kind = searchParams.get("kind")?.toLowerCase();
  const courseType =
    category && category in CATEGORY_TYPES
      ? CATEGORY_TYPES[category as CategoryParam]
      : null;

  if (!courseType && kind === "paid") {
    const paidCourses = courses.filter((course) => getPayableFee(course) > 0);
    const seen = new Map<string, BatchFilterOption>();
    for (const option of [...optionsFor("ssc"), ...optionsFor("hsc")]) {
      if (!seen.has(option.id)) seen.set(option.id, option);
    }
    const batchOptions = [...seen.values()];
    return (
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <BackToAllCourses />

          <header className="mb-10">
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary-500">
              Courses
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-heading sm:text-4xl">
              Paid Courses
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
              Browse our premium paid programs — enroll to unlock full classes,
              exams, materials and Q&amp;A support.
            </p>
          </header>

          <BatchCourseList options={batchOptions} courses={paidCourses} />
        </section>
      </main>
    );
  }

  if (courseType) {
    const typeCourses = courses.filter(
      (course) => course.category === courseType,
    );
    return (
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <BackToAllCourses />

          <header className="mb-10">
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary-500">
              Courses
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-heading sm:text-4xl">
              {courseType} Courses
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
              Select your batch to see the relevant {courseType} course lineup.
            </p>
          </header>

          {/* Same 4-option batch filters as the dedicated category pages. */}
          <BatchCourseList
            options={category === "ssc" ? optionsFor("ssc") : optionsFor("hsc")}
            courses={typeCourses}
          />
        </section>
      </main>
    );
  }

  return <DefaultGrid categories={categories} />;
}


function DefaultGrid({
  categories,
}: {
  categories: CategoryRecord[];
}) {
  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Explore Programs
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading sm:text-4xl">
            Choose Your Path
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
            Select a program to browse batch-wise courses built for SSC/HSC
            board exam success and medical &amp; varsity admission preparation.
          </p>
        </header>

        {/* Managed from Admin -> Courses -> Categories (course_categories table). */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              href={category.href || "/courses"}
              title={category.name}
              description={category.description ?? ""}
              image={category.imageUrl}
              icon={iconForSlug(category.slug)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default function CoursesView({
  courses,
  categories,
  sscFilterOptions,
  hscFilterOptions,
}: {
  courses: Course[];
  categories: CategoryRecord[];
  sscFilterOptions?: BatchFilterOption[];
  hscFilterOptions?: BatchFilterOption[];
}) {
  return (
    <Suspense fallback={<DefaultGrid categories={categories} />}>
      <CoursesViewInner
        courses={courses}
        categories={categories}
        sscFilterOptions={sscFilterOptions}
        hscFilterOptions={hscFilterOptions}
      />
    </Suspense>
  );
}
