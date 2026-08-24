"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type {
  CourseProgressDetail,
  SubjectProgress,
} from "@/lib/my-learning";

type LoadState = "loading" | "error" | "ready";

function ProgressBar({
  percent,
  size = "md",
}: {
  percent: number;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-ink/10 ${size === "sm" ? "h-1.5" : "h-2"}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function SubjectBlock({ subject }: { subject: SubjectProgress }) {
  const [open, setOpen] = useState(false);
  const hasChapters = subject.chapters.length > 0;

  return (
    <li className="rounded-xl border border-ink/10 bg-dark-950/60">
      {hasChapters ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-heading">
              {subject.subjectName}
            </span>
            <span className="text-[11px] text-neutral-500">
              {subject.completedClasses}/{subject.totalClasses} classes ·{" "}
              {subject.percent}%
            </span>
          </span>
          <span className="shrink-0">
            <ProgressBar percent={subject.percent} size="sm" />
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
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-heading">{subject.subjectName}</p>
          <p className="mt-1 text-[11px] text-neutral-500">No chapters yet</p>
        </div>
      )}

      {hasChapters && open && (
        <ul className="space-y-3 border-t border-ink/10 px-4 py-4">
          {subject.chapters.map((chapter) => (
            <li key={chapter.chapterId}>
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="min-w-0 truncate text-neutral-300">
                  {chapter.chapterName}
                </span>
                <span className="shrink-0 text-primary-400">
                  {chapter.completedClasses}/{chapter.totalClasses}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar percent={chapter.percent} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CourseProgressCard({ course }: { course: CourseProgressDetail }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20 transition duration-300 hover:border-primary-600/60">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        {/* Thumbnail */}
        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-dark-800 sm:h-24 sm:w-36">
          {course.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.imageUrl}
              alt={course.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-ink/20">
              MS
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              href={`/dashboard/enrolled-courses/${encodeURIComponent(course.slug)}`}
              className="text-lg font-extrabold leading-snug text-heading transition hover:text-primary-400"
            >
              {course.name}
            </Link>
            <span className="rounded-full border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400">
              {course.percent}%
            </span>
          </div>

          <div className="mt-3">
            <ProgressBar percent={course.percent} />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span className="text-neutral-400">
              Completed:{" "}
              <span className="font-bold text-emerald-400">
                {course.completedClasses} class{course.completedClasses === 1 ? "" : "es"}
              </span>
            </span>
            <span className="text-neutral-400">
              Remaining:{" "}
              <span className="font-bold text-yellow-400">
                {course.remainingClasses} class{course.remainingClasses === 1 ? "" : "es"}
              </span>
            </span>
            <span className="text-neutral-500">Total: {course.totalClasses}</span>
          </div>
        </div>
      </div>

      {/* Subject-wise progress */}
      {course.subjects.length > 0 && (
        <div className="border-t border-ink/10 px-5 py-5 sm:px-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Subject-wise progress
          </h3>
          <ul className="mt-3 space-y-3">
            {course.subjects.map((subject) => (
              <SubjectBlock key={subject.subjectId} subject={subject} />
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-ink/10 px-5 py-4 sm:px-6">
        <Link
          href={`/dashboard/enrolled-courses/${encodeURIComponent(course.slug)}`}
          className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          Continue Learning
        </Link>
      </div>
    </article>
  );
}

export default function CourseProgressView() {
  const { user, authLoading } = useAuth();
  const [courses, setCourses] = useState<CourseProgressDetail[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/progress", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as {
        courses?: CourseProgressDetail[];
      };
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [authLoading, user, load]);

  if (authLoading || !user || state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">
          Loading your course progress...
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-red-200/70">
            We could not load your progress. Please try again.
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

  const visible = courses ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Course Progress</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Your real learning progress — updated as you complete classes.
          </p>
        </div>
        <Link
          href="/dashboard/enrolled-courses"
          className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
        >
          My Enrolled Courses
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No progress yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            You have no active course content to track. Enroll in a course and
            start learning — your progress will appear here.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Explore Courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {visible.map((course) => (
            <CourseProgressCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}
