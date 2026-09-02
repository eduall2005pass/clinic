"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  questionImage?: string | null;
};

type SubmissionOutcome = {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  rawMarks?: number;
  negativeMarks?: number;
  negativeDeduction?: number;
  timerPenalty?: number;
  secondTimer?: boolean;
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
  explanation?: string | null;
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

function padNum(n: number): string {
  return String(n).padStart(2, "0");
}

export default function ExamParticipationArea({
  examId,
  autoBegin: propAutoBegin,
  timerType: propTimerType,
}: {
  examId: string;
  /** True when the student already accepted the Exam Rules (Start Now flow). */
  autoBegin?: boolean;
  /** First or second timer — affects grading penalty. */
  timerType?: "first" | "second";
}) {
  const searchParams = useSearchParams();
  const autoBegin = propAutoBegin ?? searchParams.get("begin") === "1";
  const timerType = propTimerType ?? (searchParams.get("timer") === "second" ? "second" : "first");
  const examHref = `/exam/${examId}`;
  const loginHref = `/login?next=${encodeURIComponent(examHref)}`;
  const { user, profile, authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exam, setExam] = useState<TakingExam | null>(null);
  const [questions, setQuestions] = useState<TakingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
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
   * Timer is ONE per entire exam; scrolling never affects it.
   */
  const activateSession = useCallback(
    (sessionToken: string | null, durationMinutes: number, serverSecondsLeft?: number | null) => {
      tokenRef.current = sessionToken;
      answersRef.current = {};
      setAnswers({});
      setBegun(true);
      // Fresh session — clear any leftover answers from a terminated one.
      // Prefer server-computed remaining time when available (authoritative clock).
      const initial =
        typeof serverSecondsLeft === "number" && Number.isFinite(serverSecondsLeft)
          ? Math.max(0, Math.floor(serverSecondsLeft))
          : Math.max(60, durationMinutes * 60);
      setSecondsLeft(initial);
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
        `/api/exams/${encodeURIComponent(examId)}?start=1&timer=${timerType}`,
        {
          headers: authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined,
          cache: "no-store",
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        sessionToken?: string | null;
        secondsLeft?: number | null;
        error?: string;
      };
      if (!response.ok) {
        setLoadError(data.error ?? "Could not start the exam. Please retry.");
        return;
      }
      activateSession(data.sessionToken ?? null, exam.durationMinutes, data.secondsLeft ?? null);
    } catch {
      setLoadError("Failed to start the exam. Check your connection.");
    } finally {
      setBeginning(false);
    }
  }, [beginning, begun, exam, examId, user, activateSession, timerType]);

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
              `/api/exams/${encodeURIComponent(examId)}?start=1&timer=${timerType}`,
              {
                headers: authToken
                  ? { Authorization: `Bearer ${authToken}` }
                  : undefined,
                cache: "no-store",
              },
            );
            const startData = (await startResponse
              .json()
              .catch(() => ({}))) as { sessionToken?: string | null; secondsLeft?: number | null };
            if (cancelled) return;
            if (startResponse.ok && data.exam) {
              activateSession(
                startData.sessionToken ?? null,
                data.exam.durationMinutes,
                startData.secondsLeft ?? null,
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
  }, [authLoading, profileLoading, user, examId, autoBegin, activateSession, timerType]);

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

  // Interrupted active exam → automatically submit and cannot be recovered/resumed.
  // Handles tab close, navigation away, refresh, and hidden tab.
  // Server-side stored answers remain authoritative; this sends the latest
  // local selections with keepalive so the result is finalized.
  useEffect(() => {
    function handleInterrupt() {
      if (submittedRef.current || !user) return;
      // Only auto-submit if the attempt has actually begun (rules accepted).
      if (!begun) return;
      submittedRef.current = true;
      try {
        const answered = answersRef.current;
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
    function handleVisibility() {
      if (document.visibilityState === "hidden") handleInterrupt();
    }
    window.addEventListener("pagehide", handleInterrupt);
    window.addEventListener("beforeunload", handleInterrupt);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", handleInterrupt);
      window.removeEventListener("beforeunload", handleInterrupt);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [examId, user, begun]);

  /** Select an answer — allowed only once per question, no changing later. */
  async function chooseOption(question: TakingQuestion, optionIndex: number) {
    if (answers[question.id] !== undefined || submitting || outcome) return;
    // Lock locally right away — option-circle selection IS the lock mechanism.
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
                      {padNum(index + 1)}. {item.question}
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
                          ? "Correct"
                          : "Wrong"}
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

    const totalQuestions = questions.length > 0 ? questions.length : outcome.correctCount + outcome.wrongCount + outcome.skippedCount;
    const submissionStatus = (outcome as { autoSubmitted?: boolean }).autoSubmitted ? "Auto Submitted" : "Manual Submit";
    return (
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-4 text-left sm:p-8">
        {terminatedNotice ? (
          <p className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-center text-sm font-semibold text-yellow-300">
            This exam was started on another device — this session was submitted automatically.
          </p>
        ) : (
          <h3 className="text-center text-lg font-extrabold text-heading">Exam Result — Submitted 🎉</h3>
        )}

        {/* Result Card — MASTER PROMPT §18: exact example format, all from common scoring service */}
        <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-ink/10 bg-dark-900 p-5 sm:p-6">
          <div className="text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-neutral-500">━━━━━━━━━━━━ Exam Result ━━━━━━━━━━━━</p>
            <div className="mt-3 grid gap-2 text-left sm:grid-cols-2">
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Student Name</p>
                <p className="text-sm font-bold text-heading">{profile?.fullName ?? user?.displayName ?? user?.email ?? "Student"}</p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Student ID</p>
                <p className="text-sm font-bold text-heading">{profile?.studentId ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Exam Name</p>
                <p className="text-sm font-bold text-heading">{outcome.examName ?? exam?.name ?? "Exam"}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-left text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Total Questions</dt>
                <dd className="text-sm font-extrabold text-heading">{totalQuestions}</dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Total Marks</dt>
                <dd className="text-sm font-extrabold text-heading">{outcome.totalMarks}</dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Time Taken</dt>
                <dd className="text-sm font-extrabold text-heading">{typeof outcome.timeTakenSeconds === "number" ? formatDuration(outcome.timeTakenSeconds) : "—"}</dd>
              </div>
              <div className="rounded-xl border border-ink/10 bg-dark-850 px-3 py-2 text-center">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Submission Status</dt>
                <dd className={`text-sm font-extrabold ${submissionStatus === "Auto Submitted" ? "text-amber-300" : "text-emerald-300"}`}>{submissionStatus}</dd>
              </div>
            </dl>
          </div>

          <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">Correct</p>
              <p className="mt-1 text-lg font-extrabold text-emerald-300">{outcome.correctCount}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Wrong</p>
              <p className="mt-1 text-lg font-extrabold text-red-300">{outcome.wrongCount}</p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-dark-850 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Unanswered</p>
              <p className="mt-1 text-lg font-extrabold text-neutral-300">{outcome.skippedCount}</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Final Marks</p>
            <p className="text-5xl font-extrabold text-primary-300">
              {outcome.score}
              <span className="text-2xl text-neutral-400"> / {outcome.totalMarks}</span>
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-300">{percentage}%</p>
          </div>

          <ul className="mt-4 grid gap-2 text-left text-sm">
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Correct Marks</span>
              <span className="font-extrabold text-emerald-300">
                {typeof outcome.rawMarks === "number" ? `${outcome.rawMarks} / ${outcome.totalMarks}` : `${outcome.correctCount} × marks`}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Negative Marking</span>
              {outcome.negativeMarks != null && outcome.negativeMarks > 0 ? (
                <span className="font-extrabold text-red-300">
                  −{outcome.negativeDeduction ?? 0}
                  <span className="ml-1 text-[11px] font-bold text-neutral-500">
                    (−{outcome.negativeMarks} × {outcome.wrongCount} wrong)
                  </span>
                </span>
              ) : (
                <span className="font-extrabold text-neutral-300">0</span>
              )}
            </li>
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Second Timer Penalty</span>
              {outcome.secondTimer ? (
                <span className="font-extrabold text-red-300">
                  −{outcome.timerPenalty ?? 0}
                  <span className="ml-1 text-[11px] font-bold text-neutral-500">(repeat attempt)</span>
                </span>
              ) : (
                <span className="font-extrabold text-neutral-300">0</span>
              )}
            </li>
            <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
              <span className="font-semibold text-neutral-400">Merit Position / Rank</span>
              <span className="font-extrabold text-primary-300">{outcome.meritPosition != null ? `#${outcome.meritPosition}` : "—"}</span>
            </li>
            {outcome.highestMark != null && (
              <li className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5">
                <span className="font-semibold text-neutral-400">Highest Mark</span>
                <span className="font-extrabold text-heading">{outcome.highestMark}</span>
              </li>
            )}
          </ul>
          <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void openAnswerScript()}
            className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-500 active:scale-[0.98] sm:w-auto"
          >
            View Answer Sheet
          </button>
          <a
            href="/dashboard"
            className="w-full rounded-xl border border-ink/10 bg-dark-850 px-6 py-3 text-center text-sm font-bold text-neutral-300 transition hover:text-heading sm:w-auto"
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

  /* ── Active exam — Single scrollable paper ─────────────────────────── */

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="space-y-4">
      {/* Sticky header: exam meta + timer + submit */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-ink/10 bg-dark-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-extrabold text-heading sm:text-base">{exam.name}</h2>
            <p className="mt-0.5 text-xs font-semibold text-neutral-400">
              {totalQuestions} Questions · {totalMarks} Marks · {exam.durationMinutes} min
              {exam.negativeMarks > 0 ? ` · −${exam.negativeMarks}/wrong` : ""}
              {" · "}
              <span className="text-primary-300">Answered {answeredCount}/{totalQuestions}</span>
              {unansweredCount > 0 ? <span className="text-neutral-500"> · {unansweredCount} left</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className={`rounded-full px-3 py-1.5 font-mono text-sm font-extrabold sm:px-4 sm:text-base ${
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
                if (window.confirm("Are you sure you want to submit the exam?")) {
                  void submit();
                }
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:px-5 sm:text-sm"
            >
              {submitting ? "Submitting…" : "Submit Exam"}
            </button>
          </div>
        </div>
        {/* Thin progress bar */}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dark-800">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-300"
            style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Exam paper — all questions vertically, free scroll */}
      <div className="rounded-2xl border border-ink/10 bg-dark-900 p-4 sm:p-6">
        {/* Paper header */}
        <div className="border-b border-ink/10 pb-4">
          <h3 className="text-base font-extrabold text-heading sm:text-lg">{exam.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-ink/10 bg-dark-850 px-3 py-1 text-neutral-300">Total Questions: {totalQuestions}</span>
            <span className="rounded-full border border-ink/10 bg-dark-850 px-3 py-1 text-neutral-300">Total Marks: {totalMarks}</span>
            <span className="rounded-full border border-ink/10 bg-dark-850 px-3 py-1 text-neutral-300">Duration: {exam.durationMinutes} min</span>
            {exam.negativeMarks > 0 && (
              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-red-300">Negative: −{exam.negativeMarks} per wrong</span>
            )}
            <span className="rounded-full border border-primary-500/20 bg-primary-600/10 px-3 py-1 text-primary-300">
              {answeredCount} answered · {unansweredCount} not answered
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            Free scrolling — answer any question in any order. Each option locks immediately after selection and cannot be changed. You may skip questions and return later. Unanswered remain clickable until you submit.
          </p>
        </div>

        {/* Questions list */}
        <ol className="mt-6 space-y-6">
          {questions.map((q, idx) => {
            const selectedIndex = answers[q.id];
            const isLocked = selectedIndex !== undefined;
            const isUnanswered = !isLocked;
            return (
              <li
                key={q.id}
                id={`q-${q.id}`}
                className={`rounded-2xl border p-4 sm:p-5 ${isLocked ? "border-primary-500/25 bg-primary-600/[0.04]" : "border-ink/10 bg-dark-850/50"}`}
              >
                {/* Question header */}
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm font-bold leading-relaxed text-heading sm:text-[15px]">
                    <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-dark-800 px-1.5 text-xs font-extrabold text-neutral-300 sm:h-7 sm:px-2">
                      {padNum(idx + 1)}
                    </span>
                    {q.question}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                      isUnanswered
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                        : "bg-primary-600/15 text-primary-300 border border-primary-500/20"
                    }`}
                  >
                    {isUnanswered ? "Not Answered" : "Locked"}
                  </span>
                </div>

                {q.questionImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.questionImage}
                    alt={`Question ${idx + 1} image`}
                    className="mt-3 max-h-72 w-full rounded-xl border border-ink/10 object-contain bg-dark-950"
                  />
                ) : null}

                <p className="mt-2 text-xs font-semibold text-neutral-500">Marks: {q.marks}</p>

                {/* Options — ○ circle style, one-time lock */}
                <div className="mt-3 space-y-2">
                  {q.options.map((option, optionIndex) => {
                    const isSelected = selectedIndex === optionIndex;
                    const disabled = isLocked || submitting;
                    // Unanswered: all options are enabled. Answered: selected shows locked, others disabled grey.
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={disabled}
                        onClick={() => void chooseOption(q, optionIndex)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition sm:px-4 ${
                          isSelected
                            ? "border-primary-500 bg-primary-600/15 text-heading shadow-sm"
                            : isLocked
                              ? "border-ink/10 bg-dark-800 text-neutral-500 opacity-60 cursor-not-allowed"
                              : "border-ink/10 bg-dark-900 text-neutral-200 hover:border-primary-500/40 hover:bg-dark-800"
                        }`}
                      >
                        {/* Circle */}
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition ${
                            isSelected
                              ? "border-primary-500 bg-primary-600 text-white"
                              : isLocked
                                ? "border-ink/20 bg-dark-800 text-neutral-500"
                                : "border-ink/20 bg-dark-850 text-neutral-400"
                          }`}
                        >
                          {isSelected ? "●" : "○"}
                        </span>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[11px] font-extrabold text-neutral-400">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="min-w-0 flex-1 break-words font-bold">{option}</span>
                        {isSelected && (
                          <span className="ml-auto shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Locked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-2.5 text-xs font-medium text-neutral-500">
                  {isLocked ? "Answer saved — locked permanently." : "Select one option — it will lock immediately and cannot be changed."}
                </p>
              </li>
            );
          })}
        </ol>

        {/* Bottom submit */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs font-semibold text-neutral-400">
            Answered <span className="font-extrabold text-primary-300">{answeredCount}</span> / {totalQuestions} · Unanswered{" "}
            <span className="font-extrabold text-amber-300">{unansweredCount}</span>
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (window.confirm("Are you sure you want to submit the exam?")) {
                void submit();
              }
            }}
            className="w-full rounded-xl bg-emerald-600 px-8 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
