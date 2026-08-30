"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isActiveEnrollment } from "@/lib/enrollments";
import PermissionGate, {
  courseDeniedGuidance,
} from "@/components/auth/PermissionGate";
import PermissionGuidanceCard from "@/components/auth/PermissionGuidanceCard";
import type {
  ChapterItem,
  CourseLearningData,
  SubjectTree,
} from "@/lib/my-learning";
import { isDirectContent } from "@/lib/course-content";
import DirectContentView from "@/components/dashboard/CourseContentCards";

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

export function useCourseLearning(slug: string) {
  const { user, authLoading } = useAuth();
  const [course, setCourse] = useState<CourseLearningData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [forbiddenKind, setForbiddenKind] = useState<
    "free" | "paid" | undefined
  >(undefined);

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
        const data = (await response.json().catch(() => null)) as {
          courseKind?: "free" | "paid";
        } | null;
        setForbiddenKind(data?.courseKind);
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

  return { course, state, load, authLoading, user, forbiddenKind };
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
  forbiddenKind,
}: {
  state: LoadState;
  load: () => Promise<void>;
  slug: string;
  forbiddenKind?: "free" | "paid";
}) {
  const { enrollments, access } = useAuth();
  if (state === "loading") return <LoadingView label="Loading course..." />;
  if (state === "forbidden") {
    const active = enrollments.filter(isActiveEnrollment);
    return (
      <PermissionGuidanceCard
        guidance={courseDeniedGuidance({
          courseSlug: slug,
          courseKind: forbiddenKind,
          hasAnyEnrollment: active.length > 0,
          hasPaidEnrollment: access.hasPaidEnrollment,
        })}
      />
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

export function BackLink({ href, label }: { href: string; label: string }) {
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

export function recordRecentView(
  user: { getIdToken: () => Promise<string> } | null,
  itemType: "course" | "class" | "exam" | "material",
  itemId: string,
) {
  if (!user) return;
  void user
    .getIdToken()
    .then((token) =>
      fetch("/api/my/recent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemType, itemId }),
      }).catch(() => undefined),
    )
    .catch(() => undefined);
}

/* ── Level 1: Course → Subjects ─────────────────────────────────────────── */


/**
 * Paper Selection — exactly one card per paper/segment (e.g.
 * "জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)" / "জীববিজ্ঞান ২য় পত্র (প্রাণীবিজ্ঞান)").
 * Papers and their chapters are managed from the Admin Panel.
 */
function PaperSelection({
  slug,
  subject,
  backHref,
  backLabel,
  heading,
}: {
  slug: string;
  subject: SubjectTree;
  backHref: string;
  backLabel: string;
  heading?: string;
}) {
  const showBack = Boolean(backHref && backLabel);
  const base = `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subject.id)}`;
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
    // Chapters without a paper (or with a missing/inactive paper) fall into
    // a General group so nothing is ever lost.
    ...(orphanChapters(subject).length > 0
      ? [{
          id: GENERAL_PAPER_ID,
          kindLabel: "General",
          name: "All Chapters",
          chapters: orphanChapters(subject),
        }]
      : []),
  ];

  return (
    <div>
      {showBack && (
        <BackLink href={backHref} label={backLabel} />
      )}
      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Paper Selection
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          {heading ?? subject.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Select your paper to open its classes, exams and materials.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No course content available yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            No papers or chapters have been published for this subject yet.
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
    </div>
  );
}


export function CourseSubjectsView({ slug }: { slug: string }) {
  return (
    <PermissionGate
      requirement="course"
      courseSlug={slug}
      loadingLabel="Loading course..."
    >
      <CourseSubjectsContent slug={slug} />
    </PermissionGate>
  );
}

function CourseSubjectsContent({ slug }: { slug: string }) {
  const { course, state, load, forbiddenKind } = useCourseLearning(slug);
  const { user } = useAuth();
  // Single-subject course (e.g. Biology) skips the subject list and opens the
  // Paper Selection page directly.
  const singleSubject =
    course && course.subjects.length === 1 ? course.subjects[0] : null;

  // Opening the course records it in the student's Recently Viewed history.
  useEffect(() => {
    if (state === "ready" && course) {
      recordRecentView(user, "course", slug);
    }
  }, [state, course, slug, user]);

  if (state !== "ready" || !course) {
    return <LevelStates state={state} load={load} slug={slug} forbiddenKind={forbiddenKind} />;
  }

  // Admin-selected content structure decides what "View Course Content" opens.
  // 'auto' keeps the legacy behaviour (direct for SSC Bio/Botany/Zoology,
  // paper selection for single-subject courses, subject list otherwise).
  const layout = course.contentLayout;
  const direct =
    isDirectContent(layout, course.name, course.slug);
  const useSubjectSelection =
    !direct &&
    (layout === "subject" ||
      // Auto: multi-subject Medical Admission opens the icon grid directly.
      (layout === "auto" &&
        course.category === "Medical Admission" &&
        course.subjects.length > 1));

  if (direct) {
    return <DirectContentView slug={slug} />;
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

      {useSubjectSelection ? (
        <SubjectSelection slug={slug} course={course} />
      ) : singleSubject ? (
        <PaperSelection
          slug={slug}
          subject={singleSubject}
          backHref="/dashboard/enrolled-courses"
          backLabel="My Enrolled Courses"
          heading={course.name}
        />
      ) : (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-heading">Subjects</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Choose a subject to see its papers / segments.
          </p>

        {course.subjects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
            <p className="font-semibold text-heading">No course content available yet.</p>
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
      )}
    </section>
  );
}

/* ── Shared helpers for subject/paper levels ────────────────────────────── */

function findSubject(course: CourseLearningData, subjectId: string): SubjectTree | null {
  return course.subjects.find((subject) => subject.id === subjectId) ?? null;
}

/**
 * Subject icon picked from the subject name (Bengali or English). Purely
 * presentational — the subject list itself always comes from the database.
 */
export function subjectIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (/জীব|উদ্ভিদ|প্রাণী|bio|botany|zoology/.test(n)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0c0-3-2.5-6-7-6 0 4.5 3 6 7 6zm0 3c0-3 2.5-5 6.5-5 .5 4-2.5 5-6.5 5zM12 21H8" />
      </svg>
    );
  }
  if (/রসায়ন|chem/.test(n)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 3v6L5 18a2 2 0 001.8 3h10.4A2 2 0 0019 18l-5-9V3M8.5 3h7M7.5 15h9" />
      </svg>
    );
  }
  if (/পদার্থ|phys/.test(n)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
      </svg>
    );
  }
  if (/সাধারণ জ্ঞান|gk|general knowledge/.test(n)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
      </svg>
    );
  }
  // English / higher math / default — open book.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

/**
 * Subject Selection page (e.g. Complete Medical Admission Course): one icon
 * card per subject, straight from the database. Clicking a card opens that
 * subject's Class / Exam / Materials content page.
 */
function SubjectSelection({
  slug,
  course,
}: {
  slug: string;
  course: CourseLearningData;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-bold text-heading">Subjects</h2>
      <p className="mt-1 text-xs text-neutral-400">
        Choose a subject to open its classes, exams and materials.
      </p>

      {course.subjects.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
          <p className="font-semibold text-heading">No course content available yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            This course has no subjects published yet. Please check back later.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {course.subjects.map((subject, index) => {
            const counts = countsOf(subject.chapters);
            return (
              <li key={subject.id}>
                <Link
                  href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subject.id)}/content`}
                  className="group flex h-full items-center gap-4 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 active:scale-[0.99] sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 transition group-hover:bg-primary-600 group-hover:text-white">
                    {subjectIcon(subject.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold leading-snug text-heading transition group-hover:text-primary-400">
                      {index + 1}. {subject.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"}
                      {" · "}
                      {counts.classes} class{counts.classes === 1 ? "" : "es"}
                      {" · "}
                      {counts.exams} exam{counts.exams === 1 ? "" : "s"}
                      {" · "}
                      {counts.materials} material{counts.materials === 1 ? "" : "s"}
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
  );
}


function chaptersForPaper(subject: SubjectTree, paperId: string): ChapterItem[] {
  if (paperId === GENERAL_PAPER_ID) return orphanChapters(subject);
  return subject.chapters.filter((chapter) => chapter.paperId === paperId);
}

/**
 * Chapters without a paper, or whose paper row is missing/inactive. These
 * must NEVER disappear from the UI (a deleted/deactivated paper used to make
 * its chapters invisible → students saw "no content"), so they always fall
 * back to the General group.
 */
function orphanChapters(subject: SubjectTree): ChapterItem[] {
  const validPaperIds = new Set(subject.papers.map((paper) => paper.id));
  return subject.chapters.filter(
    (chapter) => !chapter.paperId || !validPaperIds.has(chapter.paperId),
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
  return (
    <PermissionGate
      requirement="course"
      courseSlug={slug}
      loadingLabel="Loading course..."
    >
      <SubjectPapersContent slug={slug} subjectId={subjectId} />
    </PermissionGate>
  );
}

function SubjectPapersContent({
  slug,
  subjectId,
}: {
  slug: string;
  subjectId: string;
}) {
  const { course, state, load, forbiddenKind } = useCourseLearning(slug);
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
    return <LevelStates state={state} load={load} slug={slug} forbiddenKind={forbiddenKind} />;
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
    // Chapters without a paper (or with a missing/inactive paper) go into a
    // General group so nothing is lost.
    ...(orphanChapters(subject).length > 0
      ? [{
          id: GENERAL_PAPER_ID,
          kindLabel: "General",
          name: "All Chapters",
          chapters: orphanChapters(subject),
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
          <p className="font-semibold text-heading">No course content available yet.</p>
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

export function PaperContentView({
  slug,
  subjectId,
  paperId,
}: {
  slug: string;
  subjectId: string;
  paperId: string;
}) {
  return (
    <PermissionGate
      requirement="course"
      courseSlug={slug}
      loadingLabel="Loading course..."
    >
      <PaperChapterView slug={slug} subjectId={subjectId} paperId={paperId} />
    </PermissionGate>
  );
}

function PaperChapterView({
  slug,
  subjectId,
  paperId,
}: {
  slug: string;
  subjectId: string;
  paperId: string;
}) {
  const { course, state, load, forbiddenKind } = useCourseLearning(slug);
  const subject = course ? findSubject(course, subjectId) : null;
  const { user } = useAuth();
  // Per-card chapter selection — one independent selection per content card (Class/Exam/Materials/Archive).
  const [classChapterId, setClassChapterId] = useState<string | null>(null);
  const [examChapterId, setExamChapterId] = useState<string | null>(null);
  const [materialChapterId, setMaterialChapterId] = useState<string | null>(null);
  const [archiveChapterId, setArchiveChapterId] = useState<string | null>(null);

  const chapters = useMemo(() => {
    if (!subject) return [];
    return chaptersForPaper(subject, paperId);
  }, [subject, paperId]);

  // Structural nodes must not disappear: keep chapters even when their
  // content array is empty, as long as their contentType matches the card.
  // Legacy mixed chapters (contentType='class' but with exams/materials) are
  // also shown under the card where they have items.
  const classChapters = useMemo(
    () => chapters.filter((c) => (c.contentType ?? "class").toLowerCase() === "class" || c.classes.length > 0),
    [chapters],
  );
  const examChapters = useMemo(
    () => chapters.filter((c) => (c.contentType ?? "class").toLowerCase() === "exam" || c.exams.length > 0),
    [chapters],
  );
  const materialChapters = useMemo(
    () => chapters.filter((c) => (c.contentType ?? "class").toLowerCase() === "materials" || c.materials.length > 0),
    [chapters],
  );
  const archiveChapters = useMemo(
    () => chapters.filter((c) => (c.contentType ?? "").toLowerCase() === "archive"),
    [chapters],
  );

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
    return <LevelStates state={state} load={load} slug={slug} forbiddenKind={forbiddenKind} />;
  }

  const paper = subject.papers.find((item) => item.id === paperId);
  const paperName =
    paperId === GENERAL_PAPER_ID
      ? "All Chapters"
      : paper
        ? `${paper.kind === "segment" ? "Segment" : "Paper"} — ${paper.name}`
        : "Paper";
  const base = `/dashboard/enrolled-courses/${encodeURIComponent(slug)}/subjects/${encodeURIComponent(subjectId)}`;

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
          Choose a card, then pick a chapter to open its content.
        </p>
      </header>

      {/* Exactly 4 cards — Class / Exam / Materials / Archive (order MUST be Class, Exam, Materials, Archive). Chapter is the last level. */}
      <div className="mt-8 space-y-6">
        <ContentCard
          title="Class"
          iconClass="bg-sky-500/15 text-sky-400"
          iconPath="M8 5v14l11-7z"
          filledIcon
          chapters={classChapters}
          countKey="classes"
          selectedId={classChapterId}
          onSelect={(id) =>
            setClassChapterId((current) => (current === id ? null : id))
          }
        >
          {(chapter) => (
            <ul className="space-y-2">
              {chapter.classes.map((cls, index) => (
                <li key={cls.id}>
                  <Link
                    href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(cls.id)}`}
                    onClick={() => recordRecentView(user, "class", cls.id)}
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
                        {index + 1}. {cls.title}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {cls.durationMinutes > 0 ? cls.durationMinutes + " min" : "Class"}
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
        </ContentCard>

        <ContentCard
          title="Exam"
          iconClass="bg-violet-500/15 text-violet-400"
          iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          chapters={examChapters}
          countKey="exams"
          selectedId={examChapterId}
          onSelect={(id) =>
            setExamChapterId((current) => (current === id ? null : id))
          }
        >
          {(chapter) => (
            <ul className="space-y-2">
              {chapter.exams.map((exam, index) => (
                <li key={exam.id}>
                  <Link
                    href="/exam"
                    onClick={() => recordRecentView(user, "exam", exam.id)}
                    className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                        {index + 1}. {exam.title}
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
        </ContentCard>

        <ContentCard
          title="Materials"
          iconClass="bg-emerald-500/15 text-emerald-400"
          iconPath="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          chapters={materialChapters}
          countKey="materials"
          selectedId={materialChapterId}
          onSelect={(id) =>
            setMaterialChapterId((current) => (current === id ? null : id))
          }
        >
          {(chapter) => (
            <ul className="space-y-2">
              {chapter.materials.map((material, index) => (
                <li key={material.id}>
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      recordRecentView(user, "material", String(material.id))
                    }
                    className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                        {index + 1}. {material.title}
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
        </ContentCard>

        <ContentCard
          title="Archive"
          iconClass="bg-amber-500/15 text-amber-400"
          iconPath="M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M9 11h6"
          chapters={archiveChapters}
          countKey="archive"
          selectedId={archiveChapterId}
          onSelect={(id) =>
            setArchiveChapterId((current) => (current === id ? null : id))
          }
        >
          {(chapter) => {
            const hasContent = chapter.classes.length > 0 || chapter.materials.length > 0 || chapter.exams.length > 0;
            if (!hasContent) {
              return (
                <p className="rounded-xl border border-dashed border-ink/15 bg-dark-950/60 p-5 text-center text-sm text-neutral-400">
                  No archived content available for this chapter yet.
                </p>
              );
            }
            return (
              <ul className="space-y-2">
                {chapter.classes.map((cls, index) => (
                  <li key={`arch-${cls.id}`}>
                    <Link
                      href={`/dashboard/enrolled-courses/${encodeURIComponent(slug)}/classes/${encodeURIComponent(cls.id)}`}
                      onClick={() => recordRecentView(user, "class", cls.id)}
                      className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">{cls.title}</span>
                        <span className="text-[11px] text-neutral-500">Archived · Class</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {chapter.materials.map((m, index) => (
                  <li key={`arch-m-${m.id}`}>
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" onClick={() => recordRecentView(user, "material", String(m.id))} className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-3 transition hover:border-primary-600/50 hover:bg-ink/5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">{m.title}</span>
                        <span className="text-[11px] text-neutral-500">Archived · {materialTypeLabels[m.materialType] ?? "Material"}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            );
          }}
        </ContentCard>
      </div>
    </section>
  );
}

/** One of the four paper-content cards: title + clickable chapter buttons +
 *  the selected chapter's ordered content list. */
function ContentCard({
  title,
  iconClass,
  iconPath,
  filledIcon = false,
  chapters,
  countKey,
  selectedId,
  onSelect,
  children,
}: {
  title: string;
  iconClass: string;
  iconPath: string;
  filledIcon?: boolean;
  chapters: ChapterItem[];
  countKey: "classes" | "exams" | "materials" | "archive";
  selectedId: string | null;
  onSelect: (id: string) => void;
  children: (chapter: ChapterItem) => React.ReactNode;
}) {
  const selected = chapters.find((chapter) => chapter.id === selectedId) ?? null;
  const total = countKey === "archive"
    ? chapters.length
    : chapters.reduce(
        (sum, chapter) => sum + (chapter[countKey as "classes" | "exams" | "materials"]?.length ?? 0),
        0,
      );

  return (
    <article className="rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
      <header className="flex items-center gap-3 border-b border-ink/10 px-5 py-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <svg viewBox="0 0 24 24" fill={filledIcon ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPath} />
          </svg>
        </span>
        <h2 className="text-lg font-extrabold text-heading">{title}</h2>
        <span className="ml-auto rounded-full bg-dark-850 px-2.5 py-0.5 text-xs font-semibold text-neutral-400">
          {total} item{total === 1 ? "" : "s"}
        </span>
      </header>

      <div className="px-5 py-4">
        {chapters.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 bg-dark-950/60 p-5 text-center text-sm text-neutral-400">
            No {title.toLowerCase()} published in this paper yet.
          </p>
        ) : (
          <>
            {/* Chapter buttons */}
            <div className="flex flex-wrap gap-2">
              {chapters.map((chapter) => {
                const active = selectedId === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(chapter.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                      active
                        ? "bg-primary-600 text-white shadow-md shadow-primary-900/40 hover:bg-primary-700"
                        : "border border-ink/15 bg-ink/5 font-semibold text-neutral-300 hover:border-primary-500/60 hover:text-heading"
                    }`}
                  >
                    {chapter.name}
                    {countKey !== "archive" && (
                      <span className="ml-1.5 text-xs opacity-70">
                        {(chapter[countKey as "classes" | "exams" | "materials"]?.length ?? 0)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected chapter content — organized sequence */}
            {selected ? (
              <div className="mt-4 rounded-xl border border-ink/10 bg-dark-950/60 p-3.5">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  {selected.name}
                </p>
                {children(selected)}
              </div>
            ) : (
              <p className="mt-4 text-xs text-neutral-500">
                Select a chapter above to view its {title.toLowerCase()}.
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
