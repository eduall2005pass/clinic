"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { ContinueLearningItem } from "@/lib/my-learning";

type LoadState = "loading" | "error" | "ready";

function formatResume(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 30) return null;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return null;
  return `Stopped at ${minutes} min`;
}

function ContinueLearningCard({ item }: { item: ContinueLearningItem }) {
  const resume = formatResume(item.lastSeenSeconds);
  const classHref = `/dashboard/enrolled-courses/${encodeURIComponent(
    item.slug,
  )}/classes/${encodeURIComponent(item.classId)}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:flex-row">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-800 sm:aspect-auto sm:w-52">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.courseName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-black text-ink/20">
            MS
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-400">
          {item.subjectName}
        </p>
        <h2 className="mt-1 text-base font-extrabold leading-snug text-heading sm:text-lg">
          {item.courseName}
        </h2>

        {/* Current learning content */}
        <div className="mt-2 rounded-xl border border-ink/10 bg-dark-950/60 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Current chapter
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-heading">
            {item.chapterName}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-400">
            {item.classTitle}
          </p>
          {resume ? (
            <p className="mt-1 text-[11px] font-semibold text-primary-400">
              {resume}
            </p>
          ) : null}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-neutral-400">Progress</span>
            <span className="text-primary-500">{item.progress.percent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all"
              style={{ width: `${item.progress.percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {item.progress.completedClasses}/{item.progress.totalClasses} classes completed
          </p>
        </div>

        <div className="mt-auto pt-5">
          <Link
            href={classHref}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Continue Learning →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ContinueLearningList() {
  const { user, authLoading } = useAuth();
  const [items, setItems] = useState<ContinueLearningItem[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/continue-learning", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as {
        items?: ContinueLearningItem[];
      };
      setItems(Array.isArray(data.items) ? data.items : []);
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

  if (state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">
          Loading your in-progress learning...
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
            We could not load your continue-learning data. Please check your
            connection and try again.
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

  const visible = items ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">
            Continue Learning
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {visible.length > 0
              ? "Pick up exactly where you stopped — one entry per course."
              : "Your in-progress classes will appear here as you study."}
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto h-12 w-12 text-ink/25"
          >
            <path d="M5 4.5 19 12 5 19.5z" />
          </svg>
          <p className="mt-4 font-semibold text-heading">
            Nothing to continue right now
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            Open a class from your enrolled courses — it will show up here so
            you can resume later.
          </p>
          <Link
            href="/dashboard/enrolled-courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Go to My Courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {visible.map((item) => (
            <ContinueLearningCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
