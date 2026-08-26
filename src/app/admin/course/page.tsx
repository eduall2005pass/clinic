import type { Metadata } from "next";
import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import { getPayableFee } from "@/lib/courses";
import { getLiveCourses } from "@/lib/course-catalog";
import { fetchActiveCourseCategories, type CourseCategory } from "@/lib/course-categories-store";
import { fetchBatchFilterOptions } from "@/lib/course-filters";
import AdminBatchCourseList from "@/components/admin/AdminCoursesReplica";
import CourseManagerChip from "@/components/admin/CourseManagerChip";

export const dynamic = "force-dynamic";

/**
 * Admin → Course Control. A same-to-same visual replica of the Main Website
 * Courses page with only the required admin controls attached:
 *
 *   Choose Your Path            → [ Edit ] [ + Add Category ] at the bottom
 *     ↓ Explore Course
 *   Category Course Page        → Filter [ Edit ], each card [ Edit ],
 *                                 [ + Add Course ] at the end of the list
 *
 * Every view renders from the same MySQL data as the Main Website.
 */
export const metadata: Metadata = {
  title: "Course Control — MediSpark Admin",
  description: "Admin view of the Main Website Courses page with manage controls.",
};

const CATEGORY_TYPES = {
  ssc: "SSC Academic",
  hsc: "HSC Academic",
  medical: "Medical Admission",
  varsity: "Varsity Admission",
} as const;

type CategoryParam = keyof typeof CATEGORY_TYPES;

/** Website category name → this panel's ?category= parameter.
 *  Normalized prefix match so "SSC Academic Courses" (Course Control's
 *  display name) still maps to the "ssc" panel parameter. */
function adminParamFor(category: CourseCategory): string | null {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const token = norm(category.name);
  const entry = (
    Object.entries(CATEGORY_TYPES) as Array<[CategoryParam, string]>
  ).find(([, name]) => {
    const nameToken = norm(name);
    return token === nameToken || token.startsWith(nameToken);
  });
  return entry?.[0] ?? null;
}

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

export default async function AdminCoursesPage({
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

  // Admin sees EVERY course (published + unpublished) — same data source as
  // the website, filtered only by the same rules the website applies per view.
  const allCourses = await getLiveCourses();

  if (!courseType && kind?.toLowerCase() === "paid") {
    const paidCourses = allCourses.filter((course) => getPayableFee(course) > 0);
    const [sscOptions, hscOptions] = await Promise.all([
      fetchBatchFilterOptions("ssc"),
      fetchBatchFilterOptions("hsc"),
    ]);
    const batchOptions = [
      ...new Map([...sscOptions, ...hscOptions].map((option) => [option.id, option])).values(),
    ];
    return (
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <BackToCoursesLink />

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

          <FilterRow scope="ssc" />
          <div className="mt-3">
            <AdminBatchCourseList options={batchOptions} courses={paidCourses} editBase="/admin/courses/all" />
          </div>
          <AddCourseButton categoryName={null} />
        </section>
      </main>
    );
  }

  if (courseType) {
    const typeCourses = allCourses.filter((course) => course.category === courseType);
    const filterOptions = await fetchBatchFilterOptions(
      categoryParam === "ssc" ? "ssc" : "hsc",
    );
    return (
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <BackToCoursesLink />

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

          {/* The website's own filter — with an admin [ Edit ] control. */}
          <FilterRow scope={categoryParam === "ssc" ? "ssc" : "hsc"} />
          <div className="mt-3">
            <AdminBatchCourseList
              options={filterOptions}
              courses={typeCourses}
              editBase="/admin/courses/all"
            />
          </div>

          {/* End of course list — new courses land in THIS category. */}
          <AddCourseButton categoryName={courseType} />
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

        {/* Same category cards as the Main Website — navigation stays inside
            the admin flow (page-by-page, one new page per category). */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const param = adminParamFor(category);
            const href = param
              ? `/admin/course?category=${param}`
              : `/admin/courses/all?category=${encodeURIComponent(category.name)}`;
            return (
              <CategoryCard
                key={category.id}
                href={href}
                title={category.name}
                description={category.description ?? ""}
                image={category.imageUrl}
                icon={iconForSlug(category.slug)}
              />
            );
          })}
        </div>

        {/* Bottom of Choose Your Path — category management controls. */}
        <div className="mt-10 flex flex-wrap justify-center gap-3 border-t border-ink/10 pt-6">
          <Link
            href="/admin/courses/categories"
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary-500/50 bg-dark-900 px-5 py-2.5 text-sm font-bold text-primary-300 shadow-md shadow-black/20 transition hover:border-primary-400 hover:text-primary-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.86 4.49a2.1 2.1 0 013 2.97L8.42 18.9l-3.9 1 1-3.9L16.87 4.5z" />
            </svg>
            Edit
          </Link>
          <Link
            href="/admin/courses/categories?add=1"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            + Add Category
          </Link>
        </div>
      </section>
    </main>
  );
}

function BackToCoursesLink() {
  return (
    <Link
      href="/admin/course"
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

/** The website's batch filter row + an admin-only [ Edit Filter ] control. */
function FilterRow({ scope }: { scope: "ssc" | "hsc" }) {
  return (
    <div className="-mt-6 mb-2 flex justify-end">
      <CourseManagerChip
        href={`/admin/courses/filters?scope=${scope}`}
        label="Edit Filter"
      />
    </div>
  );
}

/** [ + Add Course ] — opens the add form pre-set to the current category. */
function AddCourseButton({ categoryName }: { categoryName: string | null }) {
  const query = new URLSearchParams({ add: "1" });
  if (categoryName) query.set("category", categoryName);
  return (
    <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 px-6 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        End of course list
      </p>
      <Link
        href={`/admin/courses/all?${query.toString()}`}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
      >
        + Add Course
      </Link>
      {categoryName && (
        <p className="text-[11px] text-neutral-500">
          The new course will be saved under{" "}
          <span className="font-bold text-neutral-400">{categoryName}</span>.
        </p>
      )}
    </div>
  );
}
