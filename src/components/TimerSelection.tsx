"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TimerChoice = "first" | "second";

export default function TimerSelection({
  examId,
  secondTimerEnabled,
  secondTimerDeduction,
  hasPriorAttempt,
}: {
  examId: string;
  secondTimerEnabled: boolean;
  secondTimerDeduction: number;
  hasPriorAttempt: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TimerChoice | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!selected || loading) return;
    setLoading(true);
    // Navigate to exam with timer type param — the ExamParticipationArea
    // reads this and passes it to the server when starting the attempt.
    router.push(`/exam/${examId}?begin=1&timer=${selected}`);
  };

  // Show Timer Type selection whenever Second Timer Penalty is enabled — student must choose First vs Second Timer.
  // Penalty is NOT auto-applied; only the explicit selection determines deduction.
  if (!secondTimerEnabled) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-primary-600/30 bg-dark-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-heading">
          Attempt Type Selection
        </h3>
        <span className="rounded-full bg-primary-600/15 px-3 py-1 text-[11px] font-bold text-primary-300">
          Required
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-400">
        Select whether this is your first attempt or a repeat attempt. This
        affects the grading penalty.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* First Timer */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setSelected("first")}
          className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition ${
            selected === "first"
              ? "border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/40"
              : "border-ink/10 bg-dark-850 hover:border-emerald-500/30"
          }`}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition ${
              selected === "first"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-dark-800 text-neutral-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-300"
            }`}
          >
            1st
          </span>
          <div>
            <p className="text-sm font-extrabold text-heading">First Timer</p>
            <p className="mt-1 text-xs text-neutral-400">
              No timer penalty will be deducted.
            </p>
          </div>
          {selected === "first" && (
            <span className="absolute right-3 top-3 text-emerald-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          )}
        </button>

        {/* Second Timer */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setSelected("second")}
          className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition ${
            selected === "second"
              ? "border-red-500/60 bg-red-500/10 ring-1 ring-red-500/40"
              : "border-ink/10 bg-dark-850 hover:border-red-500/30"
          }`}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition ${
              selected === "second"
                ? "bg-red-500/20 text-red-300"
                : "bg-dark-800 text-neutral-400 group-hover:bg-red-500/10 group-hover:text-red-300"
            }`}
          >
            2nd
          </span>
          <div>
            <p className="text-sm font-extrabold text-heading">Second Timer</p>
            <p className="mt-1 text-xs text-neutral-400">
              <span className="font-bold text-red-300">
                {secondTimerDeduction} marks
              </span>{" "}
              will be deducted from the final score.
            </p>
          </div>
          {selected === "second" && (
            <span className="absolute right-3 top-3 text-red-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
          )}
        </button>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={() => router.push(`/exam/${examId}`)}
          className="rounded-xl border border-ink/10 bg-dark-850 px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-ink/20 hover:text-heading active:scale-[0.98]"
        >
          Back / Exit
        </button>
        <button
          type="button"
          disabled={!selected || loading}
          onClick={() => void handleContinue()}
          title={selected ? undefined : "Select an attempt type first"}
          className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-ink/10 disabled:bg-dark-800 disabled:text-neutral-500 disabled:shadow-none"
        >
          {loading ? "Starting…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
