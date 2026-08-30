import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  fetchAllCourseCategories,
} from "@/lib/course-categories-store";
import {
  fetchCatalogCourse,
  fetchCourseMentorIds,
} from "@/lib/courses-admin";
import { fetchContentCounts } from "@/lib/course-catalog";
import { fetchMentors } from "@/lib/mentors";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

// Server component — replicate the admin-ui style tokens locally (that
// module is "use client" and can't be imported here).
const cardClass =
  "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 shadow-sm transition-colors duration-300 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
const buttonPrimaryClass =
  "rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98]";
const buttonSecondaryClass =
  "rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-zinc-300";

type SubjectChapterRow = {
  subject_id: string;
  subject_name: string;
  chapter_id: string | null;
  chapter_name: string | null;
};

/**
 * Course Control → <category> → Course Details.
 * Read-only full view of the course record (the single source of truth for
 * Content Control / Exam Control / Results), including mentors and the
 * chapters/topics defined through the existing subject assignment system.
 */
export default async function AdminCourseDetailsPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: categoryId, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const [categories, course] = await Promise.all([
    fetchAllCourseCategories(),
    fetchCatalogCourse(slug),
  ]);
  const category = categories.find((item) => item.id === decodeURIComponent(categoryId));
  if (!category || !course) notFound();

  const counts = await fetchContentCounts();
  const mentorIds = await fetchCourseMentorIds(slug);
  let mentors: { id: string; name: string }[] = [];
  try {
    const all = await fetchMentors();
    mentors = all
      .filter((mentor) => mentorIds.includes(mentor.id))
      .map((mentor) => ({ id: mentor.id, name: mentor.name }));
  } catch {
    // Mentors are supplementary.
  }

  let subjects: SubjectChapterRow[] = [];
  try {
    subjects = await query<SubjectChapterRow[]>(
      `SELECT s.id AS subject_id, s.name AS subject_name,
              ch.id AS chapter_id, ch.name AS chapter_name
         FROM course_subject_assignments a
         JOIN course_subjects s ON s.id = a.subject_id AND s.is_active = 1
         LEFT JOIN course_chapters ch ON ch.subject_id = s.id AND ch.is_active = 1
        WHERE a.course_slug = ?
        ORDER BY s.sort_order ASC, s.name ASC, ch.sort_order ASC, ch.name ASC`,
      [slug],
    );
  } catch {
    // Content structure is optional on this page.
  }

  const subjectsMap = new Map<string, { name: string; chapters: string[] }>();
  for (const row of subjects) {
    let entry = subjectsMap.get(row.subject_id);
    if (!entry) {
      entry = { name: row.subject_name, chapters: [] };
      subjectsMap.set(row.subject_id, entry);
    }
    if (row.chapter_name) entry.chapters.push(row.chapter_name);
  }

  const payable = course.discountFee ?? course.fee;
  const categoryBase = `/admin/course/category/${encodeURIComponent(category.id)}`;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/admin/course" className="transition hover:text-[#1a3a78]">
          Course Control
        </Link>
        <span aria-hidden="true">→</span>
        <Link href={categoryBase} className="transition hover:text-[#1a3a78]">
          {category.name}
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-[#0b1e3a] admin-dark:text-zinc-100">{course.name}</span>
      </nav>

      <div className={`${cardClass} mt-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-[#0b1e3a] admin-dark:text-white">
              {course.name}
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">/{course.slug}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`${categoryBase}?edit=${encodeURIComponent(course.slug)}`} className={buttonPrimaryClass}>
              Edit
            </Link>
            <Link href={categoryBase} className={buttonSecondaryClass}>
              Back to List
            </Link>
          </div>
        </div>

        {course.image && (
          <Image
            src={course.image}
            alt={course.name}
            width={800}
            height={300}
            unoptimized
            className="mt-4 h-auto w-full rounded-xl border border-neutral-200 object-cover admin-dark:border-zinc-700"
          />
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 sm:grid-cols-4">
          {[
            ["Category", category.name],
            ["Batch", course.batchId.toUpperCase()],
            ["Regular Fee", `৳ ${course.fee.toLocaleString("en-IN")}`],
            [
              "Discount Fee",
              course.discountFee == null ? "—" : `৳ ${course.discountFee.toLocaleString("en-IN")}`,
            ],
            ["Payable", `৳ ${payable.toLocaleString("en-IN")}`],
            ["Duration", course.duration || "—"],
            ["Total Classes", String(counts.classes.get(slug) ?? 0)],
            ["Total Exams", String(counts.exams.get(slug) ?? 0)],
            ["Publish Status", course.status],
            ["Featured", course.featured ? "ON" : "OFF"],
            ["Coupon", course.couponEnabled ? "Enabled" : "Disabled"],
            ["Mentors", mentors.length > 0 ? mentors.map((m) => m.name).join(", ") : "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] uppercase tracking-wide">{label}</dt>
              <dd className="text-sm font-semibold text-[#0b1e3a] admin-dark:text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>

        {course.shortDescription && (
          <p className="mt-4 text-sm leading-relaxed text-slate-700 admin-dark:text-zinc-300">
            {course.shortDescription}
          </p>
        )}
        {course.description && (
          <div className="mt-3 border-t border-neutral-200 pt-3 admin-dark:border-zinc-700">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Description
            </h2>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 admin-dark:text-zinc-300">
              {course.description}
            </p>
          </div>
        )}
      </div>

      {/* Chapters / Topics — via the existing subject assignment structure. */}
      <div className={`${cardClass} mt-5 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#0b1e3a] admin-dark:text-zinc-100">
            Chapters / Topics
          </h2>
          <Link
            href={`/admin/course-content-control/category/${encodeURIComponent(category.id)}`}
            className={buttonSecondaryClass}
          >
            Manage Content
          </Link>
        </div>
        {subjectsMap.size === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-slate-500 admin-dark:border-zinc-700">
            No subjects assigned to this course yet — assign subjects in Course
            Content Control to build its chapter/topic tree.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {[...subjectsMap.entries()].map(([subjectId, entry]) => (
              <li key={subjectId} className="rounded-xl border border-neutral-200 p-3 admin-dark:border-zinc-700">
                <p className="text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">
                  {entry.name}
                </p>
                {entry.chapters.length > 0 ? (
                  <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-xs font-semibold text-zinc-600 admin-dark:text-zinc-300">
                    {entry.chapters.map((chapter) => (
                      <li key={chapter}>{chapter}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">No chapters yet.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
