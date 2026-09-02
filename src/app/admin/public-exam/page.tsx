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
          <div className="mt-3 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {displayCategories.map((category) => (
              <Link
                key={category.id}
                href={`/admin/public-exam/category/${encodeURIComponent(category.id)}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99]"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-600/10 blur-3xl transition duration-300 group-hover:bg-primary-600/20" />
                <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-30" />
                <div className="relative flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500 transition duration-300 group-hover:bg-primary-600 group-hover:text-heading group-hover:shadow-md group-hover:shadow-primary-900/50">
                    <span className="text-xl">{iconForSlug(category.slug)}</span>
                  </span>
                  <h3 className="text-lg font-extrabold leading-snug text-heading transition duration-300 group-hover:text-primary-400 sm:text-xl">
                    {examCategoryLabel(category)}
                  </h3>
                </div>
                <p className="relative mt-3 line-clamp-2 flex-1 text-sm font-medium leading-relaxed text-neutral-400">
                  View and manage this category&apos;s public exams
                </p>
                <div className="relative mt-auto pt-6">
                  <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition duration-300 group-hover:bg-primary-700 group-hover:shadow-primary-900/60">
                    Explore Exams
                    <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
