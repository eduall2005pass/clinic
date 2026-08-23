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
  negativeMarks?: number;
  negativeDeduction?: number;
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
  const { user, profile, authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exam, setExam] = useState<TakingExam | null>(null);
  const [questions, setQuestions] = useState<TakingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<SubmissionOutcome | null>(null);
  const [terminatedNotice, setTerminatedNotice] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef<Record<number, number>>({});
  const tokenRef = useRef<string | null>(null);

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
          sessionToken?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !data.exam) {
          setLoadError(data.error ?? "This exam is not available right now.");
          return;
        }
        setExam(data.exam);
        setQuestions(data.questions ?? []);
        tokenRef.current = data.sessionToken ?? null;
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
          body: JSON.stringify({
            answers: Object.fromEntries(
              Object.entries(answersRef.current).map(([key, value]) => [
                key,
                value,
              ]),
            ),
          }),
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
  }, [examId, user]);

  // Countdown + auto-submit when time runs out.
  useEffect(() => {
    if (secondsLeft === null || outcome || terminatedNotice) return;
    if (secondsLeft <= 0) {
      void submit();
      return;
    }
    const timer = setTimeout(
      () => setSecondsLeft((value) => (value ?? 1) - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsLeft, outcome, terminatedNotice, submit]);

  // Interrupted exam (tab closed / navigated away) → auto-submit what was answered.
  useEffect(() => {
    function handleInterrupt() {
      if (submittedRef.current || !user) return;
      const answered = answersRef.current;
      if (!exam || Object.keys(answered).length === 0) return;
      submittedRef.current = true;
      try {
        const body = JSON.stringify({
          answers: Object.fromEntries(
            Object.entries(answered).map(([key, value]) => [String(key), value]),
          ),
        });
        void user.getIdToken().then((authToken) => {
          // keepalive lets the request finish even as the page unloads.
          void fetch(`/api/exams/${encodeURIComponent(examId)}/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body,
            keepalive: true,
          }).catch(() => undefined);
        });
      } catch {
        // Best effort — the server-side stored answers remain authoritative.
      }
    }
    window.addEventListener("pagehide", handleInterrupt);
    return () => window.removeEventListener("pagehide", handleInterrupt);
  }, [exam, examId, user]);

  /** Select an answer — allowed only once per question, no changing later. */
  async function chooseOption(question: TakingQuestion, optionIndex: number) {
    if (answers[question.id] !== undefined || submitting || outcome) return;
    // Lock locally right away.
    const next = { ...answersRef.current, [question.id]: optionIndex };
    answersRef.current = next;
    setAnswers(next);

    // Server-side enforcement + storage.
    if (tokenRef.current && user) {
      try {
        const authToken = await user.getIdToken();
        const response = await fetch(
          `/api/exams/${encodeURIComponent(examId)}/answer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              token: tokenRef.current,
              questionId: question.id,
              optionIndex,
            }),
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          accepted?: boolean;
          terminated?: boolean;
          outcome?: SubmissionOutcome;
          error?: string;
        };
        if (data.terminated && data.outcome) {
          // The exam was started on another device — this session was
          // terminated and auto-submitted.
          submittedRef.current = true;
          setTerminatedNotice(true);
          setOutcome(data.outcome);
          return;
        }
      } catch {
        // Offline answer is kept locally; the final submit still carries it.
      }
    }

    // Move to the next question automatically (no going back).
    setCurrent((value) => Math.min(value + 1, questions.length - 1));
  }

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

  // Registration (completed student profile) is required to participate.
  if (!profile) {
    return (
      <AccessMessage
        title="Registration Required to Start Exams"
        message="You can view this Public Exam without an account, but you must complete your student registration to start or submit an exam."
        actionLabel="Complete Registration"
        actionHref="/register"
        secondaryLabel="Back to Public Exams"
        secondaryHref="/exam"
      />
    );
  }

  if (loading) {
    return <AccessLoading label="Loading exam…" />;
  }

  if (loadError && !outcome) {
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
        {terminatedNotice ? (
          <p className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-300">
            This exam was started on another device — this session was
            submitted automatically.
          </p>
        ) : (
          <h3 className="text-lg font-extrabold text-heading">Exam submitted 🎉</h3>
        )}
        <p className="mt-4 text-4xl font-extrabold text-primary-300">
          {outcome.score} / {outcome.totalMarks}
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-300">{percentage}%</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-neutral-300">
          <li>✅ Correct: {outcome.correctCount}</li>
          <li>❌ Wrong: {outcome.wrongCount}</li>
          <li>⏭ Skipped: {outcome.skippedCount}</li>
        </ul>
        {/* Negative marking summary — shown here only, never during the exam. */}
        {outcome.negativeMarks != null && outcome.negativeMarks > 0 ? (
          <p className="mt-4 text-sm font-semibold text-red-300">
            Negative marking applied: −{outcome.negativeMarks} per wrong answer
            {outcome.negativeDeduction
              ? ` · deduction −${outcome.negativeDeduction}`
              : ""}
          </p>
        ) : (
          <p className="mt-4 text-sm font-semibold text-emerald-300">
            No negative marking for this exam.
          </p>
        )}
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

  const answeredCount = Object.keys(answers).length;
  const question = questions[current];
  const selected = answers[question.id];
  const locked = selected !== undefined;
  const isLast = current === questions.length - 1;

  return (
    <div className="rounded-2xl border border-primary-600/30 bg-dark-900 p-5 sm:p-6">
      {/* Header: timer + progress (no negative-marking info here). */}
      <div className="sticky top-0 z-10 -mx-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-dark-900 px-5 py-4 sm:-mx-6 sm:px-6">
        <div>
          <h3 className="font-extrabold text-heading">{exam.title}</h3>
          <p className="text-xs text-neutral-400">
            Question {current + 1} of {questions.length} · answered{" "}
            {answeredCount}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-4 py-1.5 font-mono text-lg font-extrabold ${
              secondsLeft !== null && secondsLeft < 60
                ? "bg-red-500/15 text-red-400"
                : "bg-primary-600/15 text-primary-300"
            }`}
          >
            ⏱ {formatClock(secondsLeft ?? 0)}
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (
                window.confirm(
                  `Submit the exam? ${answeredCount}/${questions.length} answered. You cannot return to previous questions.`,
                )
              ) {
                void submit();
              }
            }}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>

      {/* One question at a time — no previous-question navigation. */}
      <div className="py-8">
          <p className="text-base font-bold leading-relaxed text-heading sm:text-lg">
            {current + 1}. {question.question}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{question.marks} marks</p>

          <div className="mt-5 space-y-2.5">
            {question.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const disabled = locked || submitting;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  disabled={disabled}
                  onClick={() => void chooseOption(question, optionIndex)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    isSelected
                      ? "border-primary-500 bg-primary-600/15 text-heading"
                      : disabled
                        ? "border-ink/10 bg-dark-850 text-neutral-500 opacity-70"
                        : "border-ink/10 bg-dark-850 text-neutral-300 hover:border-primary-500/50"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      isSelected
                        ? "bg-primary-600 text-white"
                        : "bg-ink/10 text-neutral-400"
                    }`}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  {option}
                  {isSelected && (
                    <span className="ml-auto shrink-0 rounded-full bg-primary-600/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-300">
                      Locked
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-neutral-500">
            {locked
              ? "Answer saved — you cannot change it."
              : "Select an answer once — it cannot be changed afterwards."}
          </p>

          {/* Next / Submit — forward-only navigation. */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-500">
              Answered {answeredCount}/{questions.length}
            </span>
            {!isLast ? (
              <button
                type="button"
                disabled={!locked}
                onClick={() => setCurrent((value) => value + 1)}
                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next Question →
              </button>
            ) : (
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
            )}
          </div>
      </div>
    </div>
  );
}
