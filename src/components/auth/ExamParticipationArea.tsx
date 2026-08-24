"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  ExamRulesList,
  type ExamRulesData,
} from "@/components/ExamRules";

type TakingExam = ExamRulesData & {
  id: string;
  subject: string;
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
  meritPosition?: number | null;
  timeTakenSeconds?: number | null;
  highestMark?: number | null;
  examName?: string;
};

type ScriptQuestion = {
  questionId: number;
  question: string;
  options: string[];
  marks: number;
  chosenIndex: number | null;
  correctIndex: number;
  obtained: number;
};

type ResultScript = {
  examName: string;
  score: number;
  totalMarks: number;
  timeTakenSeconds: number | null;
  meritPosition: number | null;
  questions: ScriptQuestion[];
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ExamParticipationArea({
  examId,
  autoBegin = false,
}: {
  examId: string;
  /** True when the student already accepted the rules (Start Now flow). */
  autoBegin?: boolean;
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
  // Rules accepted → the actual attempt has begun.
  const [begun, setBegun] = useState(false);
  const [beginning, setBeginning] = useState(false);
  const [script, setScript] = useState<ResultScript | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef<Record<number, number>>({});
  const tokenRef = useRef<string | null>(null);

  /**
   * Activate a freshly created server session — locks in the start time and
   * starts the countdown. Only called after rules are accepted.
   */
  const activateSession = useCallback(
    (sessionToken: string | null, durationMinutes: number) => {
      tokenRef.current = sessionToken;
      answersRef.current = {};
      setAnswers({});
      setCurrent(0);
      setBegun(true);
      // Fresh session — clear any leftover answers from a terminated one.
      setSecondsLeft(Math.max(60, durationMinutes * 60));
    },
    [],
  );

  /**
   * Begin the real attempt — creates the server session and starts the
   * timer. Only called after the student accepts the exam rules.
   */
  const beginExam = useCallback(async () => {
    if (!user || beginning || begun || !exam) return;
    setBeginning(true);
    try {
      const authToken = await user.getIdToken();
      const response = await fetch(
        `/api/exams/${encodeURIComponent(examId)}?start=1`,
        {
          headers: authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined,
          cache: "no-store",
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        sessionToken?: string | null;
        error?: string;
      };
      if (!response.ok) {
        setLoadError(data.error ?? "Could not start the exam. Please retry.");
        return;
      }
      activateSession(data.sessionToken ?? null, exam.durationMinutes);
    } catch {
      setLoadError("Failed to start the exam. Check your connection.");
    } finally {
      setBeginning(false);
    }
  }, [beginning, begun, exam, examId, user, activateSession]);

  // Load the exam meta + sanitized questions first (no answers, no attempt).
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
        // "Start Now" flow: rules were already accepted on the exam card,
        // so begin the attempt right away without showing them again.
        if (autoBegin && (data.questions?.length ?? 0) > 0) {
          try {
            const authToken = await user.getIdToken();
            const startResponse = await fetch(
              `/api/exams/${encodeURIComponent(examId)}?start=1`,
              {
                headers: authToken
                  ? { Authorization: `Bearer ${authToken}` }
                  : undefined,
                cache: "no-store",
              },
            );
            const startData = (await startResponse
              .json()
              .catch(() => ({}))) as { sessionToken?: string | null };
            if (cancelled) return;
            if (startResponse.ok && data.exam) {
              activateSession(
                startData.sessionToken ?? null,
                data.exam.durationMinutes,
              );
            }
          } catch {
            if (!cancelled) setLoadError("Failed to start the exam. Please retry.");
          }
        }
      } catch {
        if (!cancelled) setLoadError("Failed to load the exam. Please retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profileLoading, user, examId, autoBegin, activateSession]);

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

  // Countdown + auto-submit when time runs out. The timer only exists once
  // the attempt has actually begun (rules accepted).
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

  const openAnswerScript = async () => {
    if (script) {
      setScriptOpen(true);
      return;
    }
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/exams/${encodeURIComponent(examId)}/result`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        },
      );
      const data = (await response.json().catch(() => ({}))) as
        | ResultScript
        | { error?: string };
      if ("questions" in data) {
        setScript(data);
        setScriptOpen(true);
      } else {
        setLoadError("error" in data && data.error ? data.error : "Answer script is not available yet.");
      }
    } catch {
      setLoadError("Failed to load the answer script. Please retry.");
    }
  };

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

  /* ── Result Card ─────────────────────────────────────────────────────── */

  if (outcome) {
    const percentage =
      outcome.totalMarks > 0
        ? Math.round((outcome.score / outcome.totalMarks) * 100)
        : 0;

    if (scriptOpen && script) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-heading">Answer Script</h3>
              <p className="text-xs text-neutral-400">{script.examName}</p>
            </div>
            <button
              type="button"
              onClick={() => setScriptOpen(false)}
              className="rounded-xl border border-ink/10 bg-dark-850 px-4 py-2 text-sm font-bold text-neutral-300 transition hover:text-heading"
            >
              ← Back to Result
            </button>
          </div>

          <ol className="space-y-4">
            {script.questions.map((item, index) => {
              const isCorrect =
                item.chosenIndex !== null && item.chosenIndex === item.correctIndex;
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
                      {item.chosenIndex === null
                        ? "Unanswered"
                        : isCorrect
                          ? `Correct +${item.obtained}`
                          : `Wrong ${item.obtained}`}
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
                              correct
                                ? "bg-emerald-500 text-white"
                                : chosen
                                  ? "bg-red-500 text-white"
                                  : "bg-ink/10 text-neutral-400"
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="min-w-0 break-words">{option}</span>
                          {correct && (
                            <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">
                              Correct Answer
                            </span>
                          )}
                          {chosen && !correct && (
                            <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-red-300">
                              Your Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center sm:p-8">
        {terminatedNotice ? (
          <p className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-300">
            This exam was started on another device — this session was
            submitted automatically.
          </p>
        ) : (
          <h3 className="text-lg font-extrabold text-heading">Exam submitted 🎉</h3>
        )}

        {/* Result card */}
        <p className="mt-4 text-xl font-extrabold text-heading">
          {outcome.examName ?? exam?.name}
        </p>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Obtained Marks
        </p>
        <p className="text-5xl font-extrabold text-primary-300">
          {outcome.score}
          <span className="text-2xl text-neutral-400"> / {outcome.totalMarks}</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-300">{percentage}%</p>

        <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
          <div className="rounded-xl border border-ink/10 bg-dark-900 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Correct</p>
            <p className="mt-1 text-lg font-extrabold text-emerald-300">{outcome.correctCount}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-dark-900 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Wrong</p>
            <p className="mt-1 text-lg font-extrabold text-red-300">{outcome.wrongCount}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-dark-900 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Unanswered</p>
            <p className="mt-1 text-lg font-extrabold text-neutral-300">{outcome.skippedCount}</p>
          </div>
        </div>

        <ul className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm">
          {outcome.negativeMarks != null && outcome.negativeMarks > 0 ? (
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-900 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Negative Marks</span>
              <span className="font-extrabold text-red-300">
                −{outcome.negativeMarks} per wrong
                {outcome.negativeDeduction ? ` · total −${outcome.negativeDeduction}` : ""}
              </span>
            </li>
          ) : (
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-900 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Negative Marks</span>
              <span className="font-extrabold text-emerald-300">None</span>
            </li>
          )}
          {typeof outcome.timeTakenSeconds === "number" && (
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-900 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Time Taken</span>
              <span className="font-extrabold text-heading">
                {formatDuration(outcome.timeTakenSeconds)}
              </span>
            </li>
          )}
          {outcome.meritPosition != null && (
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-900 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Merit Position</span>
              <span className="font-extrabold text-primary-300">#{outcome.meritPosition}</span>
            </li>
          )}
          {outcome.highestMark != null && (
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-900 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Highest Mark</span>
              <span className="font-extrabold text-heading">{outcome.highestMark}</span>
            </li>
          )}
        </ul>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void openAnswerScript()}
            className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-500 active:scale-[0.98] sm:w-auto"
          >
            View Answer Script
          </button>
          <a
            href="/dashboard"
            className="w-full rounded-xl border border-ink/10 bg-dark-850 px-6 py-3 text-sm font-bold text-neutral-300 transition hover:text-heading sm:w-auto"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  /* ── Exam Rules gate ─────────────────────────────────────────────────── */

  if (exam && !begun && questions.length > 0) {
    return (
      <div className="rounded-2xl border border-primary-600/30 bg-dark-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-heading">Exam Rules</h3>
          <span className="rounded-full bg-primary-600/15 px-3 py-1 text-[11px] font-bold text-primary-300">
            Read carefully before starting
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">{exam.name}</p>

        <div className="mt-4">
          <ExamRulesList exam={exam} />
        </div>

        <button
          type="button"
          disabled={beginning}
          onClick={() => void beginExam()}
          className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {beginning ? "Starting…" : "I Understand & Start Exam"}
        </button>
        <p className="mt-2 text-center text-xs text-neutral-500">
          The timer starts as soon as you press this button.
        </p>
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

  /* ── Active exam interface ──────────────────────────────────────────── */

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
          <h3 className="font-extrabold text-heading">{exam.name}</h3>
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
