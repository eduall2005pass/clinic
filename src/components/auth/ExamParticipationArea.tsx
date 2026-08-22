"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type TakingExam = {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
};

type TakingQuestion = {
  id: number;
  question: string;
  options: string[];
  marks: number;
};

type SubmissionOutcome = {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamParticipationArea({
  examId,
}: {
  examId: string;
}) {
  const examHref = `/exam/${examId}`;
  const loginHref = `/login?next=${encodeURIComponent(examHref)}`;
  const { user, access, authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exam, setExam] = useState<TakingExam | null>(null);
  const [questions, setQuestions] = useState<TakingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<SubmissionOutcome | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/exams/${encodeURIComponent(examId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          exam?: TakingExam;
          questions?: TakingQuestion[];
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !data.exam) {
          setLoadError(data.error ?? "This exam is not available right now.");
          return;
        }
        setExam(data.exam);
        setQuestions(data.questions ?? []);
        setSecondsLeft(Math.max(60, data.exam.durationMinutes * 60));
      } catch {
        if (!cancelled) setLoadError("Failed to load the exam. Please retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profileLoading, user, examId]);

  const submit = useCallback(async () => {
    if (submittedRef.current || !user) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/exams/${encodeURIComponent(examId)}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ answers }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as
        | SubmissionOutcome
        | { error?: string };
      if ("score" in data) {
        setOutcome(data);
      } else {
        // Allow retry on failure.
        submittedRef.current = false;
        setLoadError("error" in data && data.error ? data.error : "Submission failed.");
      }
    } catch {
      submittedRef.current = false;
      setLoadError("Submission failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [answers, examId, user]);

  // Countdown + auto-submit.
  useEffect(() => {
    if (secondsLeft === null || outcome) return;
    if (secondsLeft <= 0) {
      void submit();
      return;
    }
    const timer = setTimeout(
      // eslint-disable-next-line react-hooks/set-state-in-effect
      () => setSecondsLeft((value) => (value ?? 1) - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsLeft, outcome, submit]);

  if (authLoading || profileLoading) {
    return <AccessLoading label="Checking access..." />;
  }

  if (!user) {
    return (
      <AccessMessage
        title="Login Required to Start Exams"
        message="You can view this Public Exam without an account, but you must be logged in to start or submit an exam."
        actionLabel="Login to Start Exam"
        actionHref={loginHref}
        secondaryLabel="Back to Public Exams"
        secondaryHref="/exam"
      />
    );
  }

  if (!access.registered) {
    return (
      <AccessMessage
        title="Complete Your Registration"
        message="Finish creating your student profile before starting an exam."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
        secondaryLabel="Back to Public Exams"
        secondaryHref="/exam"
      />
    );
  }

  if (loading) {
    return <AccessLoading label="Loading exam…" />;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="font-semibold text-red-400">{loadError}</p>
      </div>
    );
  }

  if (outcome) {
    const percentage =
      outcome.totalMarks > 0
        ? Math.round((outcome.score / outcome.totalMarks) * 100)
        : 0;
    return (
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-8 text-center">
        <h3 className="text-lg font-extrabold text-heading">Exam submitted 🎉</h3>
        <p className="mt-4 text-4xl font-extrabold text-primary-300">
          {outcome.score} / {outcome.totalMarks}
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-300">{percentage}%</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-neutral-300">
          <li>✅ Correct: {outcome.correctCount}</li>
          <li>❌ Wrong: {outcome.wrongCount}</li>
          <li>⏭ Skipped: {outcome.skippedCount}</li>
        </ul>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center">
        <p className="font-semibold text-yellow-300">
          No questions have been added to this exam yet.
        </p>
      </div>
    );
  }

  const activeQuestion = questions[current];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="rounded-2xl border border-primary-600/30 bg-dark-900 p-5 sm:p-6">
      {/* Header: timer + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <h3 className="font-extrabold text-heading">{exam.title}</h3>
          <p className="text-xs text-neutral-400">
            Question {current + 1} of {questions.length} · answered {answeredCount}
            {exam.negativeMarks > 0 ? ` · −${exam.negativeMarks} per wrong` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 font-mono text-lg font-extrabold ${
            secondsLeft !== null && secondsLeft < 60
              ? "bg-red-500/15 text-red-400"
              : "bg-primary-600/15 text-primary-300"
          }`}
        >
          ⏱ {formatClock(secondsLeft ?? 0)}
        </span>
      </div>

      {/* Question */}
      <div className="py-5">
        <p className="text-base font-bold leading-relaxed text-heading">
          {current + 1}. {activeQuestion.question}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{activeQuestion.marks} marks</p>

        <div className="mt-4 space-y-2.5">
          {activeQuestion.options.map((option, index) => {
            const selected = answers[activeQuestion.id] === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [activeQuestion.id]: index }))
                }
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? "border-primary-500 bg-primary-600/15 text-heading"
                    : "border-ink/10 bg-dark-850 text-neutral-300 hover:border-primary-500/50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    selected
                      ? "bg-primary-600 text-white"
                      : "bg-ink/10 text-neutral-400"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setCurrent((value) => Math.max(0, value - 1))}
            className="rounded-lg border border-ink/10 px-4 py-2 text-xs font-bold text-neutral-300 disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={current >= questions.length - 1}
            onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}
            className="rounded-lg border border-ink/10 px-4 py-2 text-xs font-bold text-neutral-300 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            if (
              window.confirm(
                `Submit the exam? ${answeredCount}/${questions.length} answered.`,
              )
            ) {
              void submit();
            }
          }}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Exam"}
        </button>
      </div>

      {/* Question palette */}
      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-ink/10 pt-4">
        {questions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Go to question ${index + 1}`}
            className={`h-8 w-8 rounded-lg text-xs font-extrabold transition ${
              index === current
                ? "bg-primary-600 text-white"
                : answers[question.id] !== undefined
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "bg-ink/10 text-neutral-400"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
