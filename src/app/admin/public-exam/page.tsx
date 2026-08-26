import Link from "next/link";
import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";
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
        description="Categories below are synchronized from Course Control (read-only). Open a category to manage only its public exams — questions, exam settings, participants and results."
      />

      {/* Category list — synced from Course Control, no Add/Edit/Delete here. */}
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Categories (from Course Control)
        </p>
        {categories.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 admin-dark:border-zinc-700">
            No active categories found in Course Control.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/admin/public-exam/category/${encodeURIComponent(category.id)}`}
                className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-500/60 hover:shadow-md admin-dark:border-zinc-800 admin-dark:bg-zinc-900"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-xl">
                  {iconForSlug(category.slug)}
                </span>
                <h2 className="mt-3 font-bold text-zinc-900 transition group-hover:text-primary-600 admin-dark:text-zinc-100">
                  {category.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                  View and manage this category&apos;s public exams →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* General (non-category) management utilities. */}
      <div className="mt-10">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
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
