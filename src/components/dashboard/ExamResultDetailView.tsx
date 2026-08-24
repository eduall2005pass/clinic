"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { StudentExamResultDetail } from "@/lib/my-exam-results";

type LoadState = "loading" | "error" | "missing" | "ready";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ordinal(position: number): string {
  const rem100 = position % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${position}th`;
  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-dark-950/60 px-3 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-extrabold ${accent ?? "text-heading"}`}>
        {value}
      </p>
    </div>
  );
}

export default function ExamResultDetailView({ examId }: { examId: string }) {
  const { user, authLoading } = useAuth();
  const [result, setResult] = useState<StudentExamResultDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/my/exam-results/${encodeURIComponent(examId)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (response.status === 404) {
        setState("missing");
        return;
      }
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as {
        result?: StudentExamResultDetail;
      };
      setResult(data.result ?? null);
      setState(data.result ? "ready" : "missing");
    } catch {
      setState("error");
    }
  }, [user, examId]);

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
          Loading result...
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

  if (state === "missing" || !result) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
          <p className="font-bold text-yellow-300">Result not found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-yellow-200/70">
            You have no result for this exam.
          </p>
          <Link
            href="/dashboard/exam-result"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Back to Exam Results
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard/exam-result"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Exam Results
      </Link>

      {/* Header */}
      <header className="mt-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          Detailed Result
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-heading sm:text-3xl">
          {result.examName}
        </h1>
        {result.courseName && (
          <p className="mt-1 text-sm font-semibold text-neutral-400">
            {result.courseName}
          </p>
        )}
        <p className="mt-1 text-[11px] text-neutral-500">
          Submitted{" "}
          {new Date(result.submittedAt).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </header>

      {/* Final score */}
      <div className="mt-6 rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          Final Score
        </p>
        <p className="mt-1 text-5xl font-extrabold text-primary-300">
          {result.finalScore}
          <span className="text-2xl text-neutral-400">
            {" "}
            / {result.totalMarks}
          </span>
        </p>
        {result.meritPosition !== null && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-dark-950/60 px-4 py-1 text-sm font-extrabold text-yellow-300">
            Merit Position · {ordinal(result.meritPosition)}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBox label="Total Mark" value={result.totalMarks} />
        <StatBox label="Obtained Mark" value={result.obtainedMarks} accent="text-primary-400" />
        <StatBox
          label="Highest Mark"
          value={result.highestMark ?? "—"}
          accent="text-emerald-400"
        />
        <StatBox label="Correct Answers" value={result.correctCount} accent="text-emerald-400" />
        <StatBox label="Wrong Answers" value={result.wrongCount} accent="text-red-400" />
        <StatBox label="Unanswered" value={result.unansweredCount} accent="text-neutral-300" />
        {result.timeTakenSeconds !== null && (
          <StatBox
            label="Time Taken"
            value={formatDuration(result.timeTakenSeconds)}
          />
        )}
        <StatBox
          label="Negative Marking"
          value={
            result.negativePerWrong > 0 ? `−${result.negativePerWrong}/wrong` : "None"
          }
          accent={result.negativePerWrong > 0 ? "text-red-400" : undefined}
        />
        <StatBox label="Total Questions" value={result.totalQuestions || "—"} />
      </div>

      {result.negativePerWrong > 0 && result.wrongCount > 0 && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-xs font-semibold text-red-300">
          Negative marking applied: −{result.negativePerWrong} per wrong answer ×{" "}
          {result.wrongCount} wrong — already included in your final score.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard/exam-result"
          className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 text-center font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10 active:scale-[0.98]"
        >
          All Results
        </Link>
        <Link
          href="/exam"
          className="rounded-xl bg-primary-600 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          Browse Exams
        </Link>
      </div>
    </section>
  );
}
