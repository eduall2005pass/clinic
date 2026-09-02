import Link from "next/link";
import { HubHeader } from "@/components/admin/hub-ui";
import {
  fetchActiveCourseCategories,
  DEFAULT_COURSE_CATEGORIES,
} from "@/lib/course-categories-store";
import { examCategoryLabel } from "@/lib/public-exams";

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
 * Admin → Public Exam Control.
 * Landing page shows ONLY 4 category cards — no General Management.
 * Categories are synced from Course Control (by id) but filtered to the
 * 4 canonical slugs and displayed in fixed order.
 * Flow: Public Exam Control → Category → Exam List → Exam Management
 */
export default async function AdminPublicExamHub() {
  const categories = await fetchActiveCourseCategories();

  // Canonical order required by spec: SSC, HSC, Medical, University
  const CANONICAL_ORDER = ["ssc", "hsc", "medical", "varsity"] as const;

  // Build exactly 4 cards in canonical order.
  // Prefer live DB category when available, otherwise fall back to default.
  const displayCategories = CANONICAL_ORDER.map((slug) => {
    const live = categories.find((c) => c.slug === slug);
    if (live) return live;
    const fallback = DEFAULT_COURSE_CATEGORIES.find((c) => c.slug === slug);
    return fallback ?? null;
  }).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Public Exam"
        title="Public Exam Control"
        description="Select a category to view and manage its public exams. New exams created inside a category automatically belong to that category."
      />

      <div className="mt-8">
        {displayCategories.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-slate-500 admin-dark:border-zinc-700">
            No categories found.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {displayCategories.map((category) => (
              <Link
                key={category.id}
                href={`/admin/public-exam/category/${encodeURIComponent(category.id)}`}
                className="group rounded-2xl border border-[#dbeafe] bg-white p-5 shadow-sm shadow-[#0b1e3a]/5 transition hover:-translate-y-0.5 hover:border-[#93c5fd] hover:shadow-md admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-xl">
                  {iconForSlug(category.slug)}
                </span>
                <h2 className="mt-3 font-bold text-[#0b1e3a] transition group-hover:text-[#1a3a78] admin-dark:text-zinc-100">
                  {examCategoryLabel(category)}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  View and manage this category&apos;s public exams →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
