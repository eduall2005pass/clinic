"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { CourseLearningData } from "@/lib/my-learning";

type LoadState = "loading" | "error" | "forbidden" | "ready";

const materialTypeLabels: Record<string, string> = {
  slide: "Slide",
  pdf: "PDF",
  note: "Note",
  link: "Link",
  other: "Material",
};

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

function ChapterBlock({
  chapter,
  courseSlug,
}: {
  chapter: CourseLearningData["subjects"][number]["chapters"][number];
  courseSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const totalItems =
    chapter.classes.length +
    chapter.materials.length +
    chapter.exams.length;

  return (
    <li className="rounded-xl border border-ink/10 bg-dark-950/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold text-heading">{chapter.name}</span>
          {totalItems === 0 ? (
            <span className="shrink-0 rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
              Coming soon
            </span>
          ) : null}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 border-t border-ink/10 px-4 py-4">
          {chapter.classes.length > 0 && (
            <ul className="space-y-2">
              {chapter.classes.map((cls) => (
                <li key={cls.id}>
                  <Link
                    href={`/dashboard/enrolled-courses/${encodeURIComponent(courseSlug)}/classes/${encodeURIComponent(cls.id)}`}
                    className="group flex items-center gap-3 rounded-lg border border-ink/5 bg-ink/5 px-3 py-2.5 transition hover:border-primary-600/50 hover:bg-ink/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-primary-500">
                      {cls.completed ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading group-hover:text-primary-400">
                        {cls.title}
                      </span>
                      {cls.durationMinutes > 0 ? (
                        <span className="text-[11px] text-neutral-500">
                          {cls.durationMinutes} min{cls.lastSeenSeconds > 30 && !cls.completed ? " · resume" : ""}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {chapter.materials.length > 0 && (
            <ul className="space-y-2">
              {chapter.materials.map((material) => (
                <li key={material.id}>
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-ink/5 bg-ink/5 px-3 py-2.5 transition hover:border-primary-600/50 hover:bg-ink/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading">
                        {material.title}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {materialTypeLabels[material.materialType] ?? "Material"}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {chapter.exams.length > 0 && (
            <ul className="space-y-2">
              {chapter.exams.map((exam) => (
                <li key={exam.id}>
                  <Link
                    href={`/exam`}
                    className="flex items-center gap-3 rounded-lg border border-ink/5 bg-ink/5 px-3 py-2.5 transition hover:border-primary-600/50 hover:bg-ink/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading">{exam.title}</span>
                      <span className="text-[11px] text-neutral-500">
                        Exam · {exam.durationMinutes} min · {exam.totalMarks} marks
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {totalItems === 0 && (
            <p className="text-xs text-neutral-500">
              Content for this chapter will be published soon.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function SubjectCard({
  subject,
  index,
  courseSlug,
}: {
  subject: CourseLearningData["subjects"][number];
  index: number;
  courseSlug: string;
}) {
  const [open, setOpen] = useState(index === 0);
  const paperById = new Map(subject.papers.map((paper) => [paper.id, paper]));

  return (
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-base font-extrabold text-heading">
            {subject.name}
          </span>
          <span className="text-xs text-neutral-500">
            {subject.papers.length > 0
              ? `${subject.papers.length} paper/segment · `
              : ""}
            {subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-ink/10 px-5 py-4">
          {subject.papers.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {subject.papers.map((paper) => (
                <span
                  key={paper.id}
                  className="rounded-full border border-primary-500/30 bg-primary-600/10 px-2.5 py-1 text-[11px] font-bold capitalize text-primary-400"
                >
                  {paper.kind}: {paper.name}
                </span>
              ))}
            </div>
          )}

          {subject.chapters.length === 0 ? (
            <p className="text-sm text-neutral-500">No chapters yet.</p>
          ) : (
            <ul className="space-y-3">
              {[...subject.chapters]
                .sort((a, b) => {
                  if (!a.paperId || !b.paperId || a.paperId === b.paperId) return 0;
                  return a.paperId.localeCompare(b.paperId);
                })
                .map((chapter) => {
                  const paper = chapter.paperId
                    ? paperById.get(chapter.paperId)
                    : undefined;
                  return (
                    <li key={chapter.id}>
                      {paper ? (
                        <p className="mb-1 pl-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          {paper.kind === "segment" ? "Segment" : "Paper"} — {paper.name}
                        </p>
                      ) : null}
                      <ChapterBlock chapter={chapter} courseSlug={courseSlug} />
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export default function CourseLearningView({ slug }: { slug: string }) {
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
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
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
    if (user) void load();
  }, [authLoading, user, load]);

  if (authLoading || !user || state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">Loading course...</p>
      </section>
    );
  }

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

  if (state === "error" || !course) {
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard/enrolled-courses"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        My Enrolled Courses
      </Link>

      {/* Course header */}
      <header className="mt-5 grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-ink/10 bg-dark-800">
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
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400">
              {course.courseKind === "paid" ? "Paid Course" : "Free Course"}
            </span>
            <span className="rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
              {course.category}
            </span>
            {course.duration ? (
              <span className="rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
                {course.duration}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
            {course.name}
          </h1>
          {course.teacherName ? (
            <p className="mt-1 text-sm text-neutral-400">Instructor: {course.teacherName}</p>
          ) : null}
          {course.description ? (
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              {course.description}
            </p>
          ) : course.shortDescription ? (
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              {course.shortDescription}
            </p>
          ) : null}
          <div className="mt-4 max-w-md">
            <ProgressBar percent={course.progress.percent} />
            <p className="mt-1 text-[11px] text-neutral-500">
              {course.progress.completedClasses}/{course.progress.totalClasses} classes completed
            </p>
          </div>
        </div>
      </header>

      {/* Hierarchy */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-heading">Course Content</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Subject → Paper / Segment → Chapter → Class · Exam · Materials
        </p>

        {course.subjects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
            <p className="font-semibold text-heading">Content coming soon</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
              This course has no content published yet. Please check back later.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {course.subjects.map((subject, index) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                index={index}
                courseSlug={slug}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
