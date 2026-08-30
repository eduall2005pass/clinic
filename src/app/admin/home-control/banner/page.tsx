import Link from "next/link";
import { fetchActiveFeaturedSlugs } from "@/lib/featured-courses";
import { getLiveCourse } from "@/lib/course-catalog";
import { fetchFeaturedPublicExams } from "@/lib/exams-admin";
import { fetchFeaturedJerseys } from "@/lib/content-admin";

export const dynamic = "force-dynamic";

/**
 * Admin → Home Control → Sliding Banner → Edit.
 * The slider has NO manual entries — slides are generated automatically
 * from three MySQL-backed sources. This interface shows every live slide
 * grouped by source and links to the manager where each source is edited;
 * editing the source updates the slider (and website) instantly.
 */
export default async function BannerControlPage() {
  const [slugs, exams, jerseys] = await Promise.all([
    fetchActiveFeaturedSlugs(),
    fetchFeaturedPublicExams(),
    fetchFeaturedJerseys(),
  ]);
  const courses = (
    await Promise.all(slugs.map((slug) => getLiveCourse(slug)))
  ).filter((course) => course !== undefined);

  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 p-5 shadow-sm sm:p-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
  const chipClass =
    "flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2 text-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <Link
          href="/admin/home-control"
          className="text-xs font-bold text-primary-600 transition hover:text-primary-500"
        >
          ← Back to Home Control
        </Link>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Sliding Banner
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Fully dynamic — no manual banner upload exists. Slides are generated
          automatically from the sources below. Edit a source there and the
          slider updates instantly on the Main Website.
        </p>
      </header>

      {/* Source 1 — Featured Courses */}
      <div className={`${cardClass} mt-6`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
            1. Featured Courses ({courses.length})
          </h3>
          <Link
            href="/admin/marketing/featured-courses"
            className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Edit Sources
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {courses.length > 0 ? (
            courses.map((course) => (
              <li key={course.slug} className={chipClass}>
                <span className="min-w-0 truncate font-bold text-zinc-800 admin-dark:text-zinc-200">
                  {course.name}
                </span>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  ★ Featured
                </span>
              </li>
            ))
          ) : (
            <li className="text-xs text-slate-500">No featured courses yet.</li>
          )}
        </ul>
      </div>

      {/* Source 2 — Featured Public Exams */}
      <div className={`${cardClass} mt-4`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
            2. Featured Public Exams ({exams.length})
          </h3>
          <Link
            href="/admin/public-exam-control"
            className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Edit Sources
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {exams.length > 0 ? (
            exams.map((exam) => (
              <li key={exam.id} className={chipClass}>
                <span className="min-w-0 truncate font-bold text-zinc-800 admin-dark:text-zinc-200">
                  {exam.title}
                </span>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  ★ Featured
                </span>
              </li>
            ))
          ) : (
            <li className="text-xs text-slate-500">No featured public exams yet.</li>
          )}
        </ul>
      </div>

      {/* Source 3 — Featured Jerseys */}
      <div className={`${cardClass} mt-4`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
            3. Featured Jerseys ({jerseys.length})
          </h3>
          <Link
            href="/admin/content/jersey"
            className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Edit Sources
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {jerseys.length > 0 ? (
            jerseys.map((jersey) => (
              <li key={jersey.id} className={chipClass}>
                <span className="min-w-0 truncate font-bold text-zinc-800 admin-dark:text-zinc-200">
                  {jersey.name}
                </span>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  ★ Featured
                </span>
              </li>
            ))
          ) : (
            <li className="text-xs text-slate-500">No featured jerseys yet.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
