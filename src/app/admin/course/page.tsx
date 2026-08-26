import Link from "next/link";
import { HubHeader } from "@/components/admin/hub-ui";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, string> = {
  ssc: "📗",
  hsc: "📘",
  medical: "🩺",
  varsity: "🎓",
};

function iconForSlug(slug: string): string {
  const key = Object.keys(CATEGORY_ICONS).find((icon) =>
    slug.toLowerCase().includes(icon),
  );
  return CATEGORY_ICONS[key ?? "hsc"];
}

/**
 * Admin → Course Control — Category Selection.
 * Categories are the master data (Course Control manages them); every course
 * belongs to exactly one category via catalog_courses.category_id. Picking a
 * category keeps that context for the whole flow: courses → add/edit/details
 * all live under /admin/course/category/<id>/… and never fall back to an
 * "All Courses" view.
 */
export default async function AdminCourseControlPage() {
  const categories = await fetchActiveCourseCategories();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Course Control"
        title="Course Control"
        description="Select a category to manage only its courses. New courses created inside a category automatically belong to it."
      />

      {categories.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-slate-500 admin-dark:border-zinc-700">
          No active categories found. Create one first.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group flex flex-col rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#93c5fd] hover:shadow-md admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-xl">
                {iconForSlug(category.slug)}
              </span>
              <h2 className="mt-3 font-bold leading-snug text-[#0b1e3a] admin-dark:text-zinc-100">
                {category.name}
              </h2>
              <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-500">
                {category.description ?? "Courses under this category."}
              </p>
              <Link
                href={`/admin/course/category/${encodeURIComponent(category.id)}`}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-primary-700 active:scale-[0.98]"
              >
                Explore Courses
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Existing Course Control feature: category management itself. */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/courses/categories"
          className="rounded-xl border border-[#bfdbfe] px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-zinc-200"
        >
          Edit Categories
        </Link>
        <Link
          href="/admin/courses/categories?add=1"
          className="rounded-xl border border-[#bfdbfe] px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-zinc-200"
        >
          + Add Category
        </Link>
      </div>
    </section>
  );
}
