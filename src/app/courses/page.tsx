import type { Metadata } from "next";
import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import BatchCourseList from "@/components/BatchCourseList";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";
import { batches } from "@/lib/courses";
import { getLivePublicCourses } from "@/lib/course-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Explore MediSpark courses — SSC academic, HSC academic and medical admission preparation programs.",
};

const CATEGORY_TYPES = {
  ssc: "SSC Academic",
  hsc: "HSC Academic",
  medical: "Medical Admission",
} as const;

type CategoryParam = keyof typeof CATEGORY_TYPES;

const iconProps = {
  className: "h-8 w-8",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const FALLBACK_ICONS: Record<string, React.ReactNode> = {
  academic: (
    <svg {...iconProps}>
      <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  admission: (
    <svg {...iconProps}>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const categoryParam = category?.toLowerCase();
  const courseType =
    categoryParam && categoryParam in CATEGORY_TYPES
      ? CATEGORY_TYPES[categoryParam as CategoryParam]
      : null;

  if (courseType) {
    const typeCourses = (await getLivePublicCourses()).filter(
      (course) => course.category === courseType,
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
              {courseType} Courses
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
              Select your batch to see the relevant {courseType} course lineup.
            </p>
          </header>

          <BatchCourseList batches={batches} courses={typeCourses} />
        </section>
      </main>
    );
  }

  const categories = await fetchActiveCourseCategories();

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
            board exam success and medical admission preparation.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              href={category.href}
              title={category.name}
              description={category.description ?? ""}
              image={category.imageUrl}
              icon={FALLBACK_ICONS[category.slug]}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
