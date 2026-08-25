"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toVideoEmbed } from "@/lib/video-embed";
import type {
  ChapterItem,
  CourseLearningData,
  SubjectTree,
} from "@/lib/my-learning";

type LoadState = "loading" | "error" | "missing" | "ready";

const materialTypeLabels: Record<string, string> = {
  slide: "Slide",
  pdf: "PDF",
  note: "Note",
  link: "Link",
  other: "Material",
};

/** Pseudo-id for chapters that belong to no paper/segment. */
export const ADMIN_GENERAL_PAPER_ID = "general";

function useAdminCourseLearning(slug: string) {
  const [course, setCourse] = useState<CourseLearningData | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(
        `/api/admin/courses/${encodeURIComponent(slug)}/learning`,
        { cache: "no-store" },
      );
      if (response.status === 404) {
        setState("missing");
        return;
      }
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { course?: CourseLearningData };
      setCourse(data.course ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { course, state, load };
}

function LoadingView({ label }: { label: string }) {
  return (
    <section className="flex flex-col items-center px-4 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      <p className="mt-4 text-sm font-semibold text-zinc-500 admin-dark:text-zinc-400">{label}</p>
    </section>
  );
}

function AdminLevelStates({
  state,
  load,
}: {
  state: LoadState;
  load: () => Promise<void>;
}) {
  if (state === "loading") return <LoadingView label="Loading course..." />;
  if (state === "missing") {
    return (
      <section className="px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-700 admin-dark:text-yellow-300">Course not found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-yellow-800/70 admin-dark:text-yellow-200/70">
            This course does not exist in the catalog.
          </p>
          <Link
            href="/admin/enrolled-courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            All Enrolled Courses
          </Link>
        </div>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-600 admin-dark:text-red-300">Something went wrong</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-red-700/70 admin-dark:text-red-200/70">
            We could not load this course. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }
  return null;
}

function AdminBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-primary-500 admin-dark:text-zinc-400 admin-dark:hover:text-primary-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}

function AdminManageButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 shadow-sm transition hover:border-primary-500/50 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300 admin-dark:hover:text-primary-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      {label}
    </Link>
  );
}

function countsOf(chapters: ChapterItem[]) {
  return chapters.reduce(
    (acc, chapter) => ({
      classes: acc.classes + chapter.classes.length,
      exams: acc.exams + chapter.exams.length,
      materials: acc.materials + chapter.materials.length,
    }),
    { classes: 0, exams: 0, materials: 0 },
  );
}

function findSubject(course: CourseLearningData, subjectId: string): SubjectTree | null {
  return course.subjects.find((subject) => subject.id === subjectId) ?? null;
}

function chaptersForPaper(subject: SubjectTree, paperId: string): ChapterItem[] {
  return subject.chapters.filter((chapter) =>
    paperId === ADMIN_GENERAL_PAPER_ID ? !chapter.paperId : chapter.paperId === paperId,
  );
}

/* ── Level 1: Courses list card grid (mirrors student EnrolledCoursesList) ─ */

export function AdminCourseCard({
  course,
}: {
  course: {
    slug: string;
    name: string;
    imageUrl: string;
    category: string;
    batchId: string;
    shortDescription: string;
    courseKind: "free" | "paid";
    counts: { classes: number; exams: number; materials: number };
  };
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg shadow-black/5 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/10 admin-dark:border-zinc-800 admin-dark:bg-zinc-900 admin-dark:shadow-black/20">
      <div className="aspect-video w-full overflow-hidden bg-neutral-100 admin-dark:bg-dark-800">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.imageUrl}
            alt={course.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-ink/20">
            MS
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              course.courseKind === "paid"
                ? "bg-primary-600/15 text-primary-500"
                : "bg-emerald-500/10 text-emerald-500"
            }`}
          >
            {course.courseKind === "paid" ? "Paid" : "Free"}
          </span>
          {course.category ? (
            <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-zinc-500 admin-dark:border-zinc-700 admin-dark:text-zinc-400">
              {course.category}
            </span>
          ) : null}
          {course.batchId ? (
            <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] font-bold uppercase text-zinc-500 admin-dark:border-zinc-700 admin-dark:text-zinc-400">
              {course.batchId}
            </span>
          ) : null}
        </div>

        <h2 className="mt-3 text-lg font-extrabold leading-snug text-zinc-900 admin-dark:text-zinc-50">
          {course.name}
        </h2>

        {/* Content stats — same slot where the student card shows progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 admin-dark:text-zinc-400">
            <span>Content</span>
            <span className="text-primary-500">{course.counts.classes} Classes</span>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
              {course.counts.classes} class{course.counts.classes === 1 ? "" : "es"}
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
              {course.counts.exams} exam{course.counts.exams === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
              {course.counts.materials} material{course.counts.materials === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <Link
            href={`/admin/enrolled-courses/${encodeURIComponent(course.slug)}`}
            className="block w-full rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            View Course Content
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── Level 2: Course → Subjects (mirrors CourseSubjectsView) ─────────────── */

export function AdminCourseSubjectsView({ slug }: { slug: string }) {
  const { course, state, load } = useAdminCourseLearning(slug);

  if (state !== "ready" || !course) {
    return <AdminLevelStates state={state} load={load} />;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <AdminBackLink href="/admin/enrolled-courses" label="Enrolled Courses" />

      <header className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 admin-dark:border-zinc-800 admin-dark:bg-dark-800">
          {course.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.imageUrl} alt={course.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-black text-ink/20">
              MS
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary-500/40 px-2.5 py-1 text-xs font-bold text-primary-500 admin-dark:border-primary-500/40 admin-dark:text-primary-400">
              {course.courseKind === "paid" ? "Paid Course" : "Free Course"}
            </span>
            <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-bold text-zinc-500 admin-dark:border-zinc-700 admin-dark:text-zinc-300">
              {course.category}
            </span>
            {course.batchId ? (
              <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-bold uppercase text-zinc-500 admin-dark:border-zinc-700 admin-dark:text-zinc-300">
                {course.batchId}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50 sm:text-3xl">
            {course.name}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminManageButton href="/admin/courses/all" label="Edit Course" />
            <AdminManageButton href="/admin/courses/subjects" label="Manage Subjects" />
            <AdminManageButton href="/admin/courses/chapters" label="Manage Chapters" />
          </div>
        </div>
      </header>

      <div className="pt-2">
        <h2 className="text-lg font-bold text-zinc-900 admin-dark:text-zinc-50">Subjects</h2>
        <p className="mt-1 text-xs text-zinc-500 admin-dark:text-zinc-400">
          Choose a subject to see its papers / segments.
        </p>

        {course.subjects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center admin-dark:border-zinc-700 admin-dark:bg-zinc-900/60">
            <p className="font-semibold text-zinc-900 admin-dark:text-zinc-50">No subjects yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 admin-dark:text-zinc-400">
              Assign subjects to this course to build its content tree.
            </p>
            <div className="mt-5 flex justify-center">
              <AdminManageButton href="/admin/courses/subjects" label="Manage Subjects" />
            </div>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {course.subjects.map((subject) => {
              const counts = countsOf(subject.chapters);
              return (
                <li key={subject.id}>
                  <Link
                    href={`/admin/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subject.id)}`}
                    className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/10 active:scale-[0.99] admin-dark:border-zinc-800 admin-dark:bg-zinc-900 admin-dark:shadow-black/20 sm:p-5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500 transition group-hover:bg-primary-600 group-hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold text-zinc-900 transition group-hover:text-primary-500 admin-dark:text-zinc-50 admin-dark:group-hover:text-primary-400">
                        {subject.name}
                      </span>
                      <span className="text-xs text-zinc-500 admin-dark:text-zinc-500">
                        {subject.papers.length} paper{subject.papers.length === 1 ? "" : "s"}
                        {" · "}
                        {subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"}
                        {" · "}
                        {counts.classes} class{counts.classes === 1 ? "" : "es"}
                      </span>
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ── Level 3: Subject → Papers / Segments (mirrors SubjectPapersView) ───── */

export function AdminSubjectPapersView({
  slug,
  subjectId,
}: {
  slug: string;
  subjectId: string;
}) {
  const { course, state, load } = useAdminCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;

  if (state !== "ready" || !course || !subject) {
    if (state === "ready" && (!course || !subject)) {
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
            <p className="font-bold text-yellow-700 admin-dark:text-yellow-300">Subject not found</p>
            <div className="mt-4 flex justify-center">
              <AdminBackLink
                href={`/admin/enrolled-courses/${encodeURIComponent(slug)}`}
                label={`Back to ${course?.name ?? "course"}`}
              />
            </div>
          </div>
        </section>
      );
    }
    return <AdminLevelStates state={state} load={load} />;
  }

  const base = `/admin/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;
  const entries: {
    id: string;
    kindLabel: string;
    name: string;
    chapters: ChapterItem[];
  }[] = [
    ...subject.papers.map((paper) => ({
      id: paper.id,
      kindLabel: paper.kind === "segment" ? "Segment" : "Paper",
      name: paper.name,
      chapters: chaptersForPaper(subject, paper.id),
    })),
    ...(subject.chapters.some((chapter) => !chapter.paperId)
      ? [{
          id: ADMIN_GENERAL_PAPER_ID,
          kindLabel: "General",
          name: "All Chapters",
          chapters: chaptersForPaper(subject, ADMIN_GENERAL_PAPER_ID),
        }]
      : []),
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <AdminBackLink
        href={`/admin/enrolled-courses/${encodeURIComponent(slug)}`}
        label={course.name}
      />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Paper / Segment
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50 sm:text-3xl">
            {subject.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 admin-dark:text-zinc-400">
            Select a paper or segment to open its classes, exams and materials.
          </p>
        </div>
        <AdminManageButton href="/admin/courses/papers" label="Manage Papers & Materials" />
      </header>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center admin-dark:border-zinc-700 admin-dark:bg-zinc-900/60">
          <p className="font-semibold text-zinc-900 admin-dark:text-zinc-50">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 admin-dark:text-zinc-400">
            No papers, segments or chapters have been published for this subject yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => {
            const counts = countsOf(entry.chapters);
            return (
              <li key={entry.id}>
                <Link
                  href={`${base}/papers/${encodeURIComponent(entry.id)}`}
                  className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/10 active:scale-[0.99] admin-dark:border-zinc-800 admin-dark:bg-zinc-900 admin-dark:shadow-black/20 sm:p-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-zinc-400 admin-dark:text-zinc-500">
                      {entry.kindLabel}
                    </span>
                    <span className="block truncate text-base font-extrabold text-zinc-900 transition group-hover:text-primary-500 admin-dark:text-zinc-50 admin-dark:group-hover:text-primary-400">
                      {entry.name}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
                        {counts.classes} class{counts.classes === 1 ? "" : "es"}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
                        {counts.exams} exam{counts.exams === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
                        {counts.materials} material{counts.materials === 1 ? "" : "s"}
                      </span>
                    </span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ── Level 4: Paper → Chapters → Classes / Exams / Materials ────────────── */

export type TabKey = "classes" | "exams" | "materials";

const TABS: { key: TabKey; label: string }[] = [
  { key: "classes", label: "Classes" },
  { key: "exams", label: "Exams" },
  { key: "materials", label: "Materials" },
];

export function AdminPaperContentView({
  slug,
  subjectId,
  paperId,
}: {
  slug: string;
  subjectId: string;
  paperId: string;
}) {
  const { course, state, load } = useAdminCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;

  const chapters = useMemo(() => {
    if (!subject) return [];
    return chaptersForPaper(subject, paperId);
  }, [subject, paperId]);

  if (state !== "ready" || !course || !subject) {
    if (state === "ready" && (!course || !subject)) {
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
            <p className="font-bold text-yellow-700 admin-dark:text-yellow-300">Not found</p>
            <div className="mt-4 flex justify-center">
              <AdminBackLink
                href={`/admin/enrolled-courses/${encodeURIComponent(slug)}`}
                label={`Back to ${course?.name ?? "course"}`}
              />
            </div>
          </div>
        </section>
      );
    }
    return <AdminLevelStates state={state} load={load} />;
  }

  const paper = subject.papers.find((item) => item.id === paperId);
  const paperName =
    paperId === ADMIN_GENERAL_PAPER_ID
      ? "All Chapters"
      : paper
        ? `${paper.kind === "segment" ? "Segment" : "Paper"} — ${paper.name}`
        : "Paper";
  const base = `/admin/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;

  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <AdminBackLink href={base} label={subject.name} />

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          {paperName}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50 sm:text-3xl">
          {subject.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Organized by chapter — pick a class, exam or material below.
        </p>
      </header>

      {/* Exactly one row per content type — each chapter opens its own page */}
      {TABS.map((item) => {
        const typeChapters = chapters.filter((chapter) =>
          item.key === "classes"
            ? chapter.classes.length > 0
            : item.key === "exams"
              ? chapter.exams.length > 0
              : chapter.materials.length > 0,
        );
        const total = typeChapters.reduce(
          (sum, chapter) =>
            sum +
            (item.key === "classes"
              ? chapter.classes.length
              : item.key === "exams"
                ? chapter.exams.length
                : chapter.materials.length),
          0,
        );
        return (
          <section
            key={item.key}
            className="rounded-2xl border border-neutral-200 bg-white shadow-lg shadow-black/5 admin-dark:border-zinc-800 admin-dark:bg-zinc-900"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 admin-dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-50">
                  {item.label}
                </h2>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400">
                  {total} item{total === 1 ? "" : "s"}
                </span>
              </div>
              <AdminManageButton href={manageHrefFor(item.key)} label={`Manage ${item.label}`} />
            </header>

            <div className="px-5 py-4">
              {typeChapters.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-center text-sm text-zinc-500 admin-dark:border-zinc-700 admin-dark:text-zinc-400">
                  No {item.label.toLowerCase()} published in this paper yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {typeChapters.map((chapter) => (
                    <Link
                      key={chapter.id}
                      href={`${base}/papers/${encodeURIComponent(paperId)}/chapters/${encodeURIComponent(chapter.id)}?kind=${item.key}`}
                      className="group rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-primary-600/60 hover:text-primary-500 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-200"
                    >
                      {chapter.name}
                      <span className="ml-1.5 text-xs font-semibold opacity-60">
                        {item.key === "classes"
                          ? chapter.classes.length
                          : item.key === "exams"
                            ? chapter.exams.length
                            : chapter.materials.length}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-500 admin-dark:text-zinc-400">
                Click a chapter to open its dedicated page.
              </p>
            </div>
          </section>
        );
      })}
    </section>
  );
}

function manageHrefFor(kind: TabKey): string {
  return kind === "classes"
    ? "/admin/courses/classes"
    : kind === "exams"
      ? "/admin/exams/enrolled"
      : "/admin/courses/papers";
}

/* ── Level 5: Chapter page — one dedicated page per chapter/kind ────────── */

export function AdminChapterView({
  slug,
  subjectId,
  paperId,
  chapterId,
  kind,
}: {
  slug: string;
  subjectId: string;
  paperId: string;
  chapterId: string;
  kind: TabKey;
}) {
  const { course, state, load } = useAdminCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;

  if (state !== "ready" || !course || !subject) {
    return <AdminLevelStates state={state} load={load} />;
  }

  const paper = subject.papers.find((item) => item.id === paperId);
  const paperName =
    paperId === ADMIN_GENERAL_PAPER_ID
      ? "All Chapters"
      : paper
        ? paper.name
        : "Paper";
  const chapter = chaptersForPaper(subject, paperId).find(
    (item) => item.id === chapterId,
  );
  const base = `/admin/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;

  if (!chapter) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-700 admin-dark:text-yellow-300">Chapter not found</p>
          <div className="mt-4 flex justify-center">
            <AdminBackLink href={base} label={`Back to ${subject.name}`} />
          </div>
        </div>
      </section>
    );
  }

  const chapterBase =
    base +
    `/papers/${encodeURIComponent(paperId)}/chapters/${encodeURIComponent(chapterId)}`;

  const items: {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    external?: boolean;
  }[] =
    kind === "classes"
      ? chapter.classes.map((cls) => ({
          id: cls.id,
          title: cls.title,
          subtitle: cls.durationMinutes > 0 ? `${cls.durationMinutes} min` : "Class",
          href: `/admin/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(cls.id)}`,
        }))
      : kind === "exams"
        ? chapter.exams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            subtitle: `${exam.durationMinutes} min · ${exam.totalMarks} marks`,
            href: `${chapterBase}/${kind}/${encodeURIComponent(exam.id)}`,
          }))
        : chapter.materials.map((material) => ({
            id: String(material.id),
            title: material.title,
            subtitle: materialTypeLabels[material.materialType] ?? "Material",
            href: `${chapterBase}/${kind}/${encodeURIComponent(material.id)}`,
          }));

  const kindLabel =
    kind === "classes" ? "Classes / Lectures" : kind === "exams" ? "Exams" : "Materials";

  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <AdminBackLink href={base} label={`${subject.name} — ${paperName}`} />

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          {kindLabel}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50 sm:text-3xl">
          {chapter.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 admin-dark:text-zinc-400">
          {items.length} item{items.length === 1 ? "" : "s"} — click any item to open its details.
        </p>
      </header>

      <div className="flex">
        <AdminManageButton href={manageHrefFor(kind)} label={`Manage ${kindLabel}`} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center admin-dark:border-zinc-700 admin-dark:bg-zinc-900/60">
          <p className="font-semibold text-zinc-900 admin-dark:text-zinc-50">Nothing here yet</p>
          <p className="mt-1 text-sm text-zinc-500 admin-dark:text-zinc-400">
            Content will appear here once added from the manager above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={item.id}>
              <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-primary-600/50 hover:bg-neutral-50 admin-dark:border-zinc-800 admin-dark:bg-zinc-900 admin-dark:hover:bg-zinc-800/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-xs font-extrabold text-primary-500">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900 group-hover:text-primary-500 admin-dark:text-zinc-50 admin-dark:group-hover:text-primary-400">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-zinc-500 admin-dark:text-zinc-500">{item.subtitle}</span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Level 6: Content details — one dedicated page per exam/material ───── */

export function AdminContentView({
  slug,
  subjectId,
  paperId,
  chapterId,
  kind,
  contentId,
}: {
  slug: string;
  subjectId: string;
  paperId: string;
  chapterId: string;
  kind: Exclude<TabKey, "classes">;
  contentId: string;
}) {
  const { course, state, load } = useAdminCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;

  if (state !== "ready" || !course || !subject) {
    return <AdminLevelStates state={state} load={load} />;
  }
  const base = `/admin/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;

  const chapter = chaptersForPaper(subject, paperId).find(
    (item) => item.id === chapterId,
  );
  const chapterHref =
    base +
    `/papers/${encodeURIComponent(paperId)}/chapters/${encodeURIComponent(chapterId)}`;

  let title = "";
  let subtitle = "";
  let body: React.ReactNode = null;

  if (kind === "exams") {
    const exam = chapter?.exams.find((item) => item.id === contentId);
    if (!exam) {
      return (
        <DetailNotFound slug={slug} label="Exam not found" backHref={chapterHref} />
      );
    }
    title = exam.title;
    subtitle = "Exam";
    body = (
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DetailBox label="Duration" value={`${exam.durationMinutes} min`} />
        <DetailBox label="Total Marks" value={exam.totalMarks} />
        <DetailBox label="Course" value={course.name} />
      </dl>
    );
  } else {
    const material = chapter?.materials.find(
      (item) => String(item.id) === contentId,
    );
    if (!material) {
      return (
        <DetailNotFound slug={slug} label="Material not found" backHref={chapterHref} />
      );
    }
    title = material.title;
    subtitle = materialTypeLabels[material.materialType] ?? "Material";
    body = (
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailBox label="Type" value={subtitle} />
        <DetailBox label="Course" value={course.name} />
        <div className="sm:col-span-2 rounded-xl border border-neutral-200 bg-white p-3 admin-dark:border-zinc-800 admin-dark:bg-zinc-900">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">File</dt>
          <dd className="mt-1 break-all text-sm">
            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-500 hover:underline">
              {material.fileUrl}
            </a>
          </dd>
        </div>
      </dl>
    );
  }
  return (
    <section className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <AdminBackLink href={chapterHref} label={chapter?.name ?? "Back"} />

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Content Details · {subtitle}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50 sm:text-3xl">
          {title}
        </h1>
      </header>

      {body}

      <div className="flex flex-wrap gap-3 pt-2">
        <AdminManageButton
          href={manageHrefFor(kind)}
          label={`Manage in ${kind === "exams" ? "Exams" : "Papers & Materials"}`}
        />
      </div>
    </section>
  );
}

function DetailBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 admin-dark:border-zinc-800 admin-dark:bg-zinc-900">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-50">{value}</dd>
    </div>
  );
}

function DetailNotFound({
  slug,
  label,
  backHref,
}: {
  slug: string;
  label: string;
  backHref: string;
}) {
  void slug;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
        <p className="font-bold text-yellow-700 admin-dark:text-yellow-300">{label}</p>
        <div className="mt-4 flex justify-center">
          <AdminBackLink href={backHref} label="Back to Chapter" />
        </div>
      </div>
    </section>
  );
}

/* ── Level 5: Class view (mirrors ClassPlayerView layout, admin view-only) ─ */

export function AdminClassView({
  slug,
  classId,
}: {
  slug: string;
  classId: string;
}) {
  const { course, state, load } = useAdminCourseLearning(slug);

  const found = (() => {
    if (!course) return null;
    for (const subject of course.subjects) {
      for (const chapter of subject.chapters) {
        const cls = chapter.classes.find((item) => item.id === classId);
        if (cls) {
          return { chapterTitle: chapter.name, cls };
        }
      }
    }
    return null;
  })();

  if (state !== "ready" || !course) {
    return <AdminLevelStates state={state} load={load} />;
  }

  if (!found) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-700 admin-dark:text-yellow-300">Class not found</p>
          <div className="mt-4 flex justify-center">
            <AdminBackLink
              href={`/admin/enrolled-courses/${encodeURIComponent(slug)}`}
              label={`Back to ${course.name}`}
            />
          </div>
        </div>
      </section>
    );
  }

  const { cls, chapterTitle } = found;
  const embed = toVideoEmbed(cls.videoUrl);

  return (
    <section className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <AdminBackLink
        href={`/admin/enrolled-courses/${encodeURIComponent(slug)}`}
        label={course.name}
      />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            {chapterTitle}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-50">
            {cls.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 admin-dark:text-zinc-400">
            {cls.durationMinutes > 0 ? `${cls.durationMinutes} min` : "Class"}
          </p>
        </div>
        <AdminManageButton href="/admin/courses/classes" label="Manage Classes" />
      </header>

      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-lg shadow-black/20 admin-dark:border-zinc-800">
        {embed ? (
          embed.provider === "direct" ? (
            <video controls className="h-full w-full">
              <source src={embed.embedUrl} />
            </video>
          ) : (
            <iframe
              src={embed.embedUrl}
              title={cls.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-500">
            No video attached to this class yet
          </div>
        )}
      </div>

      {cls.noteUrl ? (
        <a
          href={cls.noteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-primary-500/60 hover:text-primary-500 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-200 admin-dark:hover:text-primary-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Open Lecture Note
        </a>
      ) : null}
    </section>
  );
}
