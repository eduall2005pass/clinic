"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type ScriptQuestion = {
  questionId: number;
  question: string;
  options: string[];
  marks: number;
  chosenIndex: number | null;
  correctIndex: number;
  obtained: number;
  explanation: string | null;
};

type ResultScript = {
  examName: string;
  score: number;
  totalMarks: number;
  submittedAt: string | null;
  timeTakenSeconds: number | null;
  meritPosition: number | null;
  negativeDeduction: number;
  timerPenalty: number;
  secondTimer: boolean;
  questions: ScriptQuestion[];
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ExamResultClient({
  examId,
  examName,
}: {
  examId: string;
  examName: string;
}) {
  const { user, profile, authLoading, profileLoading } = useAuth();
  const [script, setScript] = useState<ResultScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/result`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) setError(data.error ?? "No submitted result found for this exam yet.");
          return;
        }
        const data = (await res.json()) as ResultScript;
        if (!cancelled) setScript(data);
      } catch {
        if (!cancelled) setError("Failed to load result. Please retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profileLoading, user, examId]);

  if (authLoading || profileLoading) return <AccessLoading label="Loading result…" />;
  if (!user) {
    return (
      <AccessMessage
        title="Login Required"
        message="You must be logged in to view your exam result."
        actionLabel="Login"
        actionHref={`/login?next=${encodeURIComponent(`/exam/${examId}/result`)}`}
      />
    );
  }
  if (!profile) {
    return (
      <AccessMessage
        title="Registration Required"
        message="Complete your student registration to view results."
        actionLabel="Complete Registration"
        actionHref="/register"
      />
    );
  }
  if (loading) return <AccessLoading label="Loading result…" />;
  if (error || !script) {
    return (
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center">
        <p className="font-semibold text-yellow-300">{error ?? "No result found."}</p>
        <Link
          href={`/exam/${encodeURIComponent(examId)}`}
          className="mt-4 inline-block rounded-xl bg-primary-600 px-5 py-2 text-sm font-bold text-white hover:bg-primary-700"
        >
          Back to Exam
        </Link>
      </div>
    );
  }

  const totalQuestions = script.questions.length;
  const correctCount = script.questions.filter((q) => q.chosenIndex !== null && q.chosenIndex === q.correctIndex).length;
  const wrongCount = script.questions.filter((q) => q.chosenIndex !== null && q.chosenIndex !== q.correctIndex).length;
  const unanswered = totalQuestions - correctCount - wrongCount;
  const correctMarks = script.questions
    .filter((q) => q.chosenIndex !== null && q.chosenIndex === q.correctIndex)
    .reduce((s, q) => s + q.marks, 0);
  const percentage = script.totalMarks > 0 ? Math.round((script.score / script.totalMarks) * 100) : 0;

  if (showSheet) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-heading">Answer Sheet</h3>
            <p className="text-xs text-neutral-400">{script.examName}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSheet(false)}
            className="rounded-xl border border-ink/10 bg-dark-850 px-4 py-2 text-sm font-bold text-neutral-300 transition hover:text-heading"
          >
            ← Back to Result
          </button>
        </div>
        <ol className="space-y-4">
          {script.questions.map((item, index) => {
            const isCorrect = item.chosenIndex !== null && item.chosenIndex === item.correctIndex;
            // Per Spec §17/18: negative marking is shown only as a total on the Rules page/result summary, not beside each question.
            const status = item.chosenIndex === null ? "Unanswered" : isCorrect ? "Correct" : "Wrong";
            return (
              <li
                key={item.questionId}
                className={`rounded-2xl border p-4 sm:p-5 ${
                  item.chosenIndex === null
                    ? "border-ink/10 bg-dark-900"
                    : isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold leading-relaxed text-heading sm:text-base">
                    {index + 1}. {item.question}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                      item.chosenIndex === null
                        ? "bg-neutral-500/15 text-neutral-400"
                        : isCorrect
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {item.options.map((option, optionIndex) => {
                    const chosen = item.chosenIndex === optionIndex;
                    const correct = item.correctIndex === optionIndex;
                    return (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${
                          correct
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                            : chosen
                              ? "border-red-500/50 bg-red-500/10 text-red-200"
                              : "border-ink/10 bg-dark-850 text-neutral-400"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                            correct ? "bg-emerald-500 text-white" : chosen ? "bg-red-500 text-white" : "bg-ink/10 text-neutral-400"
                          }`}
                        >
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="min-w-0 break-words">{option}</span>
                        {correct && <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">Correct Answer</span>}
                        {chosen && !correct && <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-red-300">Your Answer</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold">
                  <span className="text-slate-500">
                    Marks: <span className="text-heading">{item.marks}</span>
                    <span className="ml-2 text-neutral-500">
                      Obtained: <span className={isCorrect ? "text-emerald-400" : "text-neutral-400"}>{isCorrect ? `+${item.marks}` : "0"}</span>
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Your Answer: <span className="text-heading">{item.chosenIndex == null ? "—" : String.fromCharCode(65 + item.chosenIndex)}</span>
                  </span>
                  <span className="text-slate-500">
                    Correct: <span className="text-heading">{String.fromCharCode(65 + item.correctIndex)}</span>
                  </span>
                </div>
                {item.explanation && (
                  <div className="mt-2 rounded-lg bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200">
                    <span className="font-extrabold">Explanation: </span>
                    {item.explanation}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-4 sm:p-8">
      <h3 className="text-center text-lg font-extrabold text-heading">Exam Result</h3>
      <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-ink/10 bg-dark-900 p-5 sm:p-6">
        <div className="text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-neutral-500">━━━━━━━━━━━━ Exam Result ━━━━━━━━━━━━</p>
          <div className="mt-3 grid gap-2 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Student Name</p>
              <p className="text-sm font-bold text-heading">{profile.fullName}</p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Student ID</p>
              <p className="text-sm font-bold text-heading">{profile.studentId ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Exam Name</p>
              <p className="text-sm font-bold text-heading">{script.examName || examName}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-left text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Total Questions</dt>
              <dd className="text-sm font-extrabold text-heading">{totalQuestions}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Total Marks</dt>
              <dd className="text-sm font-extrabold text-heading">{script.totalMarks}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Time Taken</dt>
              <dd className="text-sm font-extrabold text-heading">{script.timeTakenSeconds != null ? formatDuration(script.timeTakenSeconds) : "—"}</dd>
            </div>
            <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Submission Status</dt>
              <dd className="text-sm font-extrabold text-heading">Completed</dd>
            </div>
          </dl>
        </div>

        <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">Correct</p>
            <p className="mt-1 text-lg font-extrabold text-emerald-300">{correctCount}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Wrong</p>
            <p className="mt-1 text-lg font-extrabold text-red-300">{wrongCount}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-dark-850 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Unanswered</p>
            <p className="mt-1 text-lg font-extrabold text-neutral-300">{unanswered}</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Final Marks</p>
          <p className="text-5xl font-extrabold text-primary-300">
            {script.score}
            <span className="text-2xl text-neutral-400"> / {script.totalMarks}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-300">{percentage}%</p>
        </div>

        <ul className="mt-4 grid gap-2 text-left text-sm">
          <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
            <span className="font-semibold text-neutral-400">Correct Marks</span>
            <span className="font-extrabold text-emerald-300">{correctMarks} / {script.totalMarks}</span>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
            <span className="font-semibold text-neutral-400">Negative Marking</span>
            <span className="font-extrabold text-red-300">{script.negativeDeduction > 0 ? `−${script.negativeDeduction}` : "0"}</span>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
            <span className="font-semibold text-neutral-400">Second Timer Penalty</span>
            <span className="font-extrabold text-red-300">{script.secondTimer ? `−${script.timerPenalty}` : "0"}</span>
          </li>
          <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
            <span className="font-semibold text-neutral-400">Merit Position / Rank</span>
            <span className="font-extrabold text-primary-300">{script.meritPosition != null ? `#${script.meritPosition}` : "—"}</span>
          </li>
        </ul>
        <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-500 active:scale-[0.98] sm:w-auto"
        >
          View Answer Sheet
        </button>
        <Link
          href="/dashboard"
          className="w-full rounded-xl border border-ink/10 bg-dark-850 px-6 py-3 text-center text-sm font-bold text-neutral-300 transition hover:text-heading sm:w-auto"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
