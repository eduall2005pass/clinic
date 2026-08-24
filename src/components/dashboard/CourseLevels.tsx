"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type {
  ChapterItem,
  CourseLearningData,
  SubjectTree,
} from "@/lib/my-learning";

type LoadState = "loading" | "error" | "forbidden" | "ready";

const materialTypeLabels: Record<string, string> = {
  slide: "Slide",
  pdf: "PDF",
  note: "Note",
  link: "Link",
  other: "Material",
};

/** Pseudo-id for chapters that belong to no paper/segment. */
export const GENERAL_PAPER_ID = "general";

function useCourseLearning(slug: string) {
  const { user, authLoading } = useAuth();
  const [course, setCourse] = useState<CourseLearningData | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/my/courses/${encodeURIComponent(slug)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (response.status === 403) {
        setState("forbidden");
        return;
      }
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { course?: CourseLearningData };
      setCourse(data.course ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user, slug]);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [authLoading, user, load]);

  return { course, state, load, authLoading, user };
}

function LoadingView({ label }: { label: string }) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      <p className="mt-4 text-sm font-semibold text-neutral-400">{label}</p>
    </section>
  );
}

export function LevelStates({
  state,
  load,
  slug,
}: {
  state: LoadState;
  load: () => Promise<void>;
  slug: string;
}) {
  if (state === "loading") return <LoadingView label="Loading course..." />;
  if (state === "forbidden") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Not enrolled</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-yellow-200/70">
            You are not actively enrolled in this course, so its content is not
            available.
          </p>
          <Link
            href="/dashboard/enrolled-courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            My Enrolled Courses
          </Link>
        </div>
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-red-200/70">
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
  void slug;
  return null;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-neutral-400">Course progress</span>
        <span className="text-primary-500">{percent}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
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

/* ── Level 1: Course → Subjects ─────────────────────────────────────────── */

export function CourseSubjectsView({ slug }: { slug: string }) {
  const { course, state, load } = useCourseLearning(slug);

  if (state !== "ready" || !course) {
    return <LevelStates state={state} load={load} slug={slug} />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href="/dashboard/enrolled-courses" label="My Enrolled Courses" />

      {/* Course header */}
      <header className="mt-5 grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-ink/10 bg-dark-800">
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
            <span className="rounded-full border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400">
              {course.courseKind === "paid" ? "Paid Course" : "Free Course"}
            </span>
            <span className="rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
              {course.category}
            </span>
            {course.batchId ? (
              <span className="rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-xs font-bold uppercase text-neutral-300">
                {course.batchId}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
            {course.name}
          </h1>
          <div className="mt-4 max-w-md">
            <ProgressBar percent={course.progress.percent} />
            <p className="mt-1 text-[11px] text-neutral-500">
              {course.progress.completedClasses}/{course.progress.totalClasses} classes completed
            </p>
          </div>
        </div>
      </header>

      {/* Subject list */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-heading">Subjects</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Choose a subject to see its papers / segments.
        </p>

        {course.subjects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
            <p className="font-semibold text-heading">Content coming soon</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
              This course has no content published yet. Please check back later.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {course.subjects.map((subject) => {
              const counts = countsOf(subject.chapters);
              return (
                <li key={subject.id}>
                  <Link
                    href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subject.id)}`}
                    className="group flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99] sm:p-5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 transition group-hover:bg-primary-600 group-hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold text-heading transition group-hover:text-primary-400">
                        {subject.name}
                      </span>
                      <span className="text-xs text-neutral-500">
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

/* ── Shared helpers for subject/paper levels ────────────────────────────── */

function findSubject(course: CourseLearningData, subjectId: string): SubjectTree | null {
  return course.subjects.find((subject) => subject.id === subjectId) ?? null;
}

function chaptersForPaper(subject: SubjectTree, paperId: string): ChapterItem[] {
  return subject.chapters.filter((chapter) =>
    paperId === GENERAL_PAPER_ID ? !chapter.paperId : chapter.paperId === paperId,
  );
}

function ContentCountBadges({ counts }: { counts: { classes: number; exams: number; materials: number } }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <span className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
        {counts.classes} class{counts.classes === 1 ? "" : "es"}
      </span>
      <span className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
        {counts.exams} exam{counts.exams === 1 ? "" : "s"}
      </span>
      <span className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
        {counts.materials} material{counts.materials === 1 ? "" : "s"}
      </span>
    </span>
  );
}

/* ── Level 2: Subject → Papers / Segments ──────────────────────────────── */

export function SubjectPapersView({
  slug,
  subjectId,
}: {
  slug: string;
  subjectId: string;
}) {
  const { course, state, load } = useCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;

  if (state !== "ready" || !course || !subject) {
    if (state === "ready" && (!course || !subject)) {
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
            <p className="font-bold text-yellow-300">Subject not found</p>
            <BackLink
              href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`}
              label={`Back to ${course?.name ?? "course"}`}
            />
          </div>
        </section>
      );
    }
    return <LevelStates state={state} load={load} slug={slug} />;
  }

  const base = `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;
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
    // Chapters without a paper go into a General group so nothing is lost.
    ...(subject.chapters.some((chapter) => !chapter.paperId)
      ? [{
          id: GENERAL_PAPER_ID,
          kindLabel: "General",
          name: "All Chapters",
          chapters: chaptersForPaper(subject, GENERAL_PAPER_ID),
        }]
      : []),
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink
        href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`}
        label={course.name}
      />

      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Paper / Segment
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          {subject.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Select a paper or segment to open its classes, exams and materials.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">Content coming soon</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            No papers, segments or chapters have been published for this subject yet.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {entries.map((entry) => {
            const counts = countsOf(entry.chapters);
            return (
              <li key={entry.id}>
                <Link
                  href={`${base}/papers/${encodeURIComponent(entry.id)}`}
                  className="group flex items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99] sm:p-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                      {entry.kindLabel}
                    </span>
                    <span className="block truncate text-base font-extrabold text-heading transition group-hover:text-primary-400">
                      {entry.name}
                    </span>
                    <span className="mt-1.5 block">
                      <ContentCountBadges counts={counts} />
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

/* ── Level 3: Paper → Classes / Exams / Materials, grouped by Chapter ──── */

type TabKey = "classes" | "exams" | "materials";

const TABS: { key: TabKey; label: string }[] = [
  { key: "classes", label: "Classes" },
  { key: "exams", label: "Exams" },
  { key: "materials", label: "Materials" },
];

export function PaperContentView({
  slug,
  subjectId,
  paperId,
}: {
  slug: string;
  subjectId: string;
  paperId: string;
}) {
  const { course, state, load } = useCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;
  const [tab, setTab] = useState<TabKey>("classes");

  const chapters = useMemo(() => {
    if (!subject) return [];
    return chaptersForPaper(subject, paperId);
  }, [subject, paperId]);

  if (state !== "ready" || !course || !subject) {
    if (state === "ready" && (!course || !subject)) {
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
            <p className="font-bold text-yellow-300">Not found</p>
            <BackLink
              href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}`}
              label={`Back to ${course?.name ?? "course"}`}
            />
          </div>
        </section>
      );
    }
    return <LevelStates state={state} load={load} slug={slug} />;
  }

  const paper = subject.papers.find((item) => item.id === paperId);
  const paperName =
    paperId === GENERAL_PAPER_ID
      ? "All Chapters"
      : paper
        ? `${paper.kind === "segment" ? "Segment" : "Paper"} — ${paper.name}`
        : "Paper";
  const counts = countsOf(chapters);
  const base = `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;

  const visibleChapters = chapters.filter((chapter) =>
    tab === "classes"
      ? chapter.classes.length > 0
      : tab === "exams"
        ? chapter.exams.length > 0
        : chapter.materials.length > 0,
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href={base} label={subject.name} />

      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          {paperName}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          {subject.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Organized by chapter — pick a class, exam or material below.
        </p>
      </header>

      {/* Tabs */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex flex-nowrap gap-2 sm:flex-wrap">
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-primary-600 text-white shadow-md shadow-primary-900/40 hover:bg-primary-700"
                    : "border border-ink/15 bg-ink/5 font-semibold text-neutral-400 hover:border-primary-500/60 hover:text-heading"
                }`}
              >
                {item.label}
                <span className="ml-1.5 text-xs opacity-70">
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content grouped BY CHAPTER — chapter is the last level. */}
      {visibleChapters.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            No {tab} have been published in this paper / segment. Please check back later.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {visibleChapters.map((chapter) => (
            <div key={chapter.id}>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-heading">
                <span className="h-4 w-1 rounded-full bg-primary-500" />
                {chapter.name}
              </h2>

              {tab === "classes" && (
                <ul className="mt-3 space-y-2">
                  {chapter.classes.map((cls) => (
                    <li key={cls.id}>
                      <Link
                        href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(cls.id)}`}
                        className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls.completed ? "bg-emerald-500/15 text-emerald-400" : "bg-primary-600/15 text-primary-500"}`}>
                          {cls.completed ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                            {cls.title}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {cls.durationMinutes > 0 ? `${cls.durationMinutes} min` : "Class"}
                            {cls.lastSeenSeconds > 30 && !cls.completed ? " · resume" : ""}
                          </span>
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {tab === "exams" && (
                <ul className="mt-3 space-y-2">
                  {chapter.exams.map((exam) => (
                    <li key={exam.id}>
                      <Link
                        href="/exam"
                        className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                            {exam.title}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            Exam · {exam.durationMinutes} min · {exam.totalMarks} marks
                          </span>
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {tab === "materials" && (
                <ul className="mt-3 space-y-2">
                  {chapter.materials.map((material) => (
                    <li key={material.id}>
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                            {material.title}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {materialTypeLabels[material.materialType] ?? "Material"}
                          </span>
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h7m0 0v7m0-7L10 16" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
