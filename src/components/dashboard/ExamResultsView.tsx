"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type {
  StudentExamResultGroup,
  StudentExamResultRow,
} from "@/lib/my-exam-results";

type LoadState = "loading" | "error" | "ready";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function RankBadge({ position }: { position: number | null }) {
  if (position === null) {
    return <span className="text-xs text-neutral-500">—</span>;
  }
  const highlight =
    position === 1
      ? "bg-yellow-400/15 text-yellow-300 border-yellow-500/40"
      : position <= 3
        ? "bg-primary-600/15 text-primary-300 border-primary-500/40"
        : "bg-ink/5 text-neutral-300 border-ink/10";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-extrabold ${highlight}`}
    >
      #{position}
    </span>
  );
}

function ResultTable({ results }: { results: StudentExamResultRow[] }) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-xl border border-ink/10 sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Exam Name</th>
              <th className="px-3 py-3 text-center">Total Mark</th>
              <th className="px-3 py-3 text-center">Obtained</th>
              <th className="px-3 py-3 text-center">Highest Mark</th>
              <th className="px-4 py-3 text-right">Ranking</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr
                key={result.examId}
                className="border-b border-ink/5 last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="block font-semibold text-heading">
                    {result.examName}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {formatDate(result.submittedAt)}
                    {result.timeTakenSeconds !== null
                      ? ` · ${formatDuration(result.timeTakenSeconds)}`
                      : ""}
                  </span>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-neutral-300">
                  {result.totalMarks}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-extrabold text-primary-400">
                    {result.obtainedMarks}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {" "}
                    /{result.totalMarks}
                  </span>
                </td>
                <td className="px-3 py-3 text-center font-semibold text-neutral-300">
                  {result.highestMark ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <RankBadge position={result.meritPosition} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2.5 sm:hidden">
        {results.map((result) => (
          <li
            key={result.examId}
            className="rounded-xl border border-ink/10 bg-dark-950/60 p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-heading">
                  {result.examName}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {formatDate(result.submittedAt)}
                  {result.timeTakenSeconds !== null
                    ? ` · ${formatDuration(result.timeTakenSeconds)}`
                    : ""}
                </p>
              </div>
              <RankBadge position={result.meritPosition} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-ink/5 px-1 py-1.5">
                <dt className="text-[10px] font-semibold uppercase text-neutral-500">Total</dt>
                <dd className="text-sm font-bold text-neutral-300">{result.totalMarks}</dd>
              </div>
              <div className="rounded-lg bg-primary-600/10 px-1 py-1.5">
                <dt className="text-[10px] font-semibold uppercase text-neutral-500">Obtained</dt>
                <dd className="text-sm font-extrabold text-primary-400">{result.obtainedMarks}</dd>
              </div>
              <div className="rounded-lg bg-ink/5 px-1 py-1.5">
                <dt className="text-[10px] font-semibold uppercase text-neutral-500">Highest</dt>
                <dd className="text-sm font-bold text-neutral-300">{result.highestMark ?? "—"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ExamResultsView() {
  const { user, authLoading } = useAuth();
  const [groups, setGroups] = useState<StudentExamResultGroup[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/exam-results", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { groups?: StudentExamResultGroup[] };
      setGroups(Array.isArray(data.groups) ? data.groups : []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [authLoading, user, load]);

  if (state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">
          Loading your exam results...
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
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

  const all = groups ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      <header className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          Exam Results
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          All exams you have taken, grouped course-wise.
        </p>
      </header>

      {all.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </span>
          <p className="mt-4 font-semibold text-heading">No exam results yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            You have not participated in any exam yet. Join a live exam and your
            result will appear here right after submission.
          </p>
          <Link
            href="/exam"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Browse Public Exams
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {all.map((group) => (
            <article
              key={group.courseSlug ?? "__general"}
              className="overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-ink/5 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-extrabold text-heading sm:text-lg">
                    {group.courseName}
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    {group.results.length} exam{group.results.length === 1 ? "" : "s"} taken
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-ink/10 bg-dark-850 px-3 py-1.5 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                      Total Mark
                    </span>
                    <span className="block text-sm font-extrabold text-heading">
                      {group.totalMarks}
                    </span>
                  </span>
                  <span className="rounded-lg border border-primary-500/30 bg-primary-600/10 px-3 py-1.5 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-primary-400/70">
                      Obtained
                    </span>
                    <span className="block text-sm font-extrabold text-primary-400">
                      {group.obtainedMarks}
                    </span>
                  </span>
                </div>
              </header>

              <div className="p-4 sm:p-5">
                <ResultTable results={group.results} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
