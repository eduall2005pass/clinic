import Link from "next/link";
import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";
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
 * Categories are NOT managed here — they are the live Course Control master
 * data (read-only sync by category id). Selecting a category opens a
 * dedicated page listing ONLY that category's public exams; questions,
 * settings and results stay scoped to each exam.
 */
export default async function AdminPublicExamHub() {
  const categories = await fetchActiveCourseCategories();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Public Exam"
        title="Public Exam Control"
        description="Category → Exam. Categories below are synchronized with the Main Website Public Exam section by the same category ID — open a category and use + Add Exam; new exams appear on the website automatically."
      />

      {/* Category list — synced ids, exam labels, no Add/Edit/Delete here. */}
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Exam Categories
        </p>
        {categories.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-slate-500 admin-dark:border-zinc-700">
            No active categories found in Course Control.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/admin/public-exam/category/${encodeURIComponent(category.id)}`}
                className="group rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#93c5fd] hover:shadow-md admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]"
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

      {/* General (non-category) management utilities. */}
      <div className="mt-10">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          General Management
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ManagementCard
            href="/admin/exams/question-bank"
            title="Question Bank"
            description="Reusable question pool for building exams."
          />
          <ManagementCard
            href="/admin/exams/answer-keys"
            title="Answer Keys"
            description="Per-exam answer keys used for grading."
          />
          <ManagementCard
            href="/admin/exams/results"
            title="Results"
            description="Student results, merit positions and highest marks."
          />
          <ManagementCard
            href="/admin/exams/settings"
            title="Exam Settings"
            description="Duration, negative marking and review defaults."
          />
        </div>
      </div>
    </section>
  );
}
