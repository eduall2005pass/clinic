import type { Metadata } from "next";
import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import BatchCourseList from "@/components/BatchCourseList";
import { getPayableFee } from "@/lib/courses";
import { getLivePublicCourses } from "@/lib/course-catalog";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";
import { fetchBatchFilterOptions } from "@/lib/course-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Explore MediSpark courses — SSC academic, HSC academic, medical and varsity admission preparation programs.",
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
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const CATEGORY_ICONS: Record<CategoryParam, React.ReactNode> = {
  // SSC Academic — school building
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
  // HSC Academic — graduation cap
  hsc: (
    <svg {...iconProps}>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  ),
  // Medical Admission — stethoscope
  medical: (
    <svg {...iconProps}>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  ),
  // Varsity Admission — university / institution building
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

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; kind?: string }>;
}) {
  const { category, kind } = await searchParams;
  const categoryParam = category?.toLowerCase();
  const courseType =
    categoryParam && categoryParam in CATEGORY_TYPES
      ? CATEGORY_TYPES[categoryParam as CategoryParam]
      : null;

  if (!courseType && kind?.toLowerCase() === "paid") {
    const paidCourses = (await getLivePublicCourses()).filter(
      (course) => getPayableFee(course) > 0,
    );
    const [sscOptions, hscOptions] = await Promise.all([
      fetchBatchFilterOptions("ssc"),
      fetchBatchFilterOptions("hsc"),
    ]);
    const batchOptions = [
      ...new Map([...sscOptions, ...hscOptions].map(
        (option) => [option.id, option],
      ),
    ).values(),
    ];
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
    const typeCourses = (await getLivePublicCourses()).filter(
      (course) => course.category === courseType,
    );
    const filterOptions = await fetchBatchFilterOptions(
      categoryParam === "ssc" ? "ssc" : "hsc",
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

          {/* Batch filters — editable from Admin → Course Control → Filter Edit. */}
          <BatchCourseList options={filterOptions} courses={typeCourses} />
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
            board exam success and medical &amp; varsity admission preparation.
          </p>
        </header>

        {/* Managed from Admin → Courses → Categories (course_categories table). */}
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
