"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  cardClass,
  buttonSecondaryClass,
} from "@/components/admin/admin-ui";
import type {
  PublicExamResultHeader,
  PublicExamResultRow,
  PublicExamStudentResult,
} from "@/lib/public-exam-results";

type Stats = {
  participants: number;
  highestMark: number | null;
  lowestMark: number | null;
  averageMark: number | null;
};

function formatClock(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Admin → Result Control → Public Exam Result → <examId>.
 * Ranking-first participant list for exactly ONE public exam, with a
 * complete per-student result modal and question-by-question answer sheet.
 */
export default function PublicExamResultDetailView({
  examId,
}: {
  examId: string;
}) {
  const gate = useAdminGate();
  const [exam, setExam] = useState<PublicExamResultHeader | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [results, setResults] = useState<PublicExamResultRow[] | null>(null);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicExamStudentResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setNotFound(false);
    setResults(null);
    try {
      const response = await fetch(
        `/api/admin/exams/public-results?examId=${encodeURIComponent(examId)}`,
        { cache: "no-store", headers: gate.headers },
      );
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = (await response.json()) as {
        exam?: PublicExamResultHeader | null;
        stats?: Stats | null;
        results?: PublicExamResultRow[];
      };
      setExam(data.exam ?? null);
      setStats(data.stats ?? null);
      setResults(data.results ?? []);
    } catch {
      setError(true);
    }
  }, [gate.headers, examId]);

  useEffect(() => {
    if (gate.ready)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard admin gate load
      void load();
  }, [gate.ready, load]);

  // Load ONE student's full result (student_id + exam_id scoped).
  const openDetail = useCallback(
    async (studentUid: string) => {
      setOpenStudent(studentUid);
      setDetail(null);
      setDetailError(false);
      setDetailLoading(true);
      try {
        const response = await fetch(
          `/api/admin/exams/public-results?examId=${encodeURIComponent(examId)}&studentUid=${encodeURIComponent(studentUid)}`,
          { cache: "no-store", headers: gate.headers },
        );
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const data = (await response.json()) as {
          result?: PublicExamStudentResult;
        };
        setDetail(data.result ?? null);
      } catch {
        setDetailError(true);
      } finally {
        setDetailLoading(false);
      }
    },
    [gate.headers, examId],
  );

  // Search keeps the stored ranking order — it only filters, never re-sorts.
  const visible = useMemo(() => {
    if (!results) return [];
    const term = search.trim().toLowerCase();
    if (!term) return results;
    return results.filter((row) =>
      [row.studentName, row.studentId, row.email, row.studentUid]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [results, search]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage
        title="Administrators only"
        message="Restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    ) : (
      <AccessLoading label="Loading exam results…" />
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
        <Link href="/admin/result-control" className="transition hover:text-primary-600">
          Result Control
        </Link>
        <span aria-hidden="true">→</span>
        <Link href="/admin/result-control/public-exam" className="transition hover:text-primary-600">
          Public Exam Result
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-zinc-900 admin-dark:text-zinc-100">Details</span>
      </nav>

      {/* Exam-level summary */}
      {exam && (
        <div className={`${cardClass} mt-4 p-5`}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-zinc-900 admin-dark:text-zinc-50">
              {exam.title}
            </h1>
            {exam.categoryName && (
              <span className="rounded-full bg-primary-600/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-600">
                {exam.categoryName}
              </span>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-zinc-500 sm:grid-cols-4">
            {[
              ["Total Participants", String(stats?.participants ?? 0)],
              ["Completed", String(results?.length ?? 0)],
              ["Total Marks", String(exam.totalMarks)],
              [
                "Average Marks",
                stats?.averageMark == null ? "—" : String(stats.averageMark),
              ],
              [
                "Highest Marks",
                stats?.highestMark == null ? "—" : String(stats.highestMark),
              ],
              [
                "Lowest Marks",
                stats?.lowestMark == null ? "—" : String(stats.lowestMark),
              ],
              ["Exam Date", formatDate(exam.scheduledAt)],
              ["Duration", `${exam.durationMinutes} min`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wide">{label}</dt>
                <dd className="text-sm text-zinc-900 admin-dark:text-zinc-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Search — filtering only; ranking order is preserved. */}
      {results !== null && results.length > 0 && (
        <div className={`${cardClass} mt-4 p-3`}>
          <label htmlFor="res-search" className="sr-only">Search participants</label>
          <input
            id="res-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, student ID or email…"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100"
          />
        </div>
      )}

      {results === null && !error && (
        <p className={`${cardClass} mt-4 p-6 text-center text-sm text-zinc-500`}>
          Loading…
        </p>
      )}

      {notFound && (
        <p className={`${cardClass} mt-4 p-8 text-center text-sm text-zinc-500`}>
          Exam not found — it may not be a Public Exam.
        </p>
      )}

      {error && results === null && !notFound && (
        <div className={`${cardClass} mt-4 p-6 text-center`}>
          <p className="text-sm font-semibold text-red-500">Something went wrong.</p>
          <button type="button" onClick={() => void load()} className={`${buttonSecondaryClass} mt-3`}>
            Try Again
          </button>
        </div>
      )}

      {results !== null && results.length === 0 && !error && (
        <p className={`${cardClass} mt-4 p-8 text-center text-sm text-zinc-500`}>
          No Participants Found
        </p>
      )}

      {visible.length > 0 && (
        <ul className="mt-4 space-y-2">
          {visible.map((row) => (
            <li key={row.resultId} className={`${cardClass} flex flex-wrap items-center gap-3 px-4 py-3`}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  row.rank === 1
                    ? "bg-amber-400/20 text-amber-600"
                    : row.rank === 2
                      ? "bg-zinc-500/15 text-zinc-600"
                      : row.rank === 3
                        ? "bg-orange-500/15 text-orange-600"
                        : "bg-zinc-500/10 text-zinc-500"
                }`}
                title="Merit position"
              >
                #{row.rank ?? "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                  {row.studentName || row.studentUid}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {[row.studentId, row.email].filter(Boolean).join(" · ") || row.studentUid}
                  {" · "}
                  {formatDate(row.submittedAt)}
                  {row.timeTakenSeconds != null && ` · ⏱ ${formatClock(row.timeTakenSeconds)}`}
                </span>
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                  row.totalMarks > 0 && row.obtained / row.totalMarks >= 0.6
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {row.obtained}/{row.totalMarks}
              </span>
              <button
                type="button"
                onClick={() => void openDetail(row.studentUid)}
                className={buttonSecondaryClass}
              >
                View Details
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Student result modal */}
      {openStudent && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenStudent(null);
          }}
        >
          <div className={`${cardClass} max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-100">
                Student Result
              </h2>
              <button
                type="button"
                onClick={() => setOpenStudent(null)}
                aria-label="Close student result"
                className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-500/10 hover:text-zinc-900 admin-dark:hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            {detailLoading && (
              <p className="mt-6 p-6 text-center text-sm text-zinc-500">Loading…</p>
            )}
            {detailError && !detailLoading && (
              <div className="mt-6 p-6 text-center">
                <p className="text-sm font-semibold text-red-500">Something went wrong.</p>
                <button
                  type="button"
                  onClick={() => void openDetail(openStudent)}
                  className={`${buttonSecondaryClass} mt-3`}
                >
                  Try Again
                </button>
              </div>
            )}

            {detail && (
              <div className="mt-4">
                {/* Student information */}
                <section className="rounded-xl border border-neutral-200 p-4 admin-dark:border-zinc-700">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
                    Student Information
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {[
                      ["Name", detail.studentName],
                      ["Student ID", detail.studentId ?? "—"],
                      ["Email", detail.email ?? "—"],
                      ["Institution", detail.institution ?? "—"],
                      ["HSC Batch", detail.hscBatch ?? "—"],
                      ["Contact", detail.contactNumber ?? "—"],
                      [
                        "Rank",
                        detail.rank == null ? "—" : `#${detail.rank} of ${detail.participantCount || "—"}`,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-semibold uppercase tracking-wide text-[10px] text-zinc-500">
                          {label}
                        </dt>
                        <dd className="font-semibold text-zinc-900 admin-dark:text-zinc-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Marks & ranking */}
                <section className="mt-4 rounded-xl border border-neutral-200 p-4 admin-dark:border-zinc-700">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
                    Marks &amp; Ranking
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                    {[
                      ["Exam", detail.examTitle],
                      ["Category", detail.categoryName ?? "—"],
                      ["Total Marks", String(detail.totalMarks)],
                      ["Obtained (Raw)", String(detail.rawMarks)],
                      [
                        "Correct",
                        String(detail.correctCount),
                      ],
                      ["Wrong", String(detail.wrongCount)],
                      ["Unanswered", String(detail.unansweredCount)],
                      [
                        `Negative Marking${detail.negativeEnabled ? ` (−${detail.negativePerWrong}/wrong)` : ""}`,
                        `−${detail.negativeDeduction}`,
                      ],
                      [
                        detail.secondTimerEnabled
                          ? `Second Timer Penalty${detail.isSecondTimer ? "" : " (not applied)"}`
                          : "Second Timer Penalty",
                        detail.timerPenalty > 0 ? `−${detail.timerPenalty}` : "0",
                      ],
                      ["Final Marks", String(detail.finalMarks)],
                      ["Time Taken", formatClock(detail.timeTakenSeconds)],
                      ["Start Time", formatDate(detail.startedAt)],
                      ["Submission Time", formatDate(detail.submittedAt)],
                      [
                        "Attempt Status",
                        detail.attemptStatus === "submitted"
                          ? "Completed"
                          : detail.attemptStatus ?? "Completed",
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-semibold uppercase tracking-wide text-[10px] text-zinc-500">
                          {label}
                        </dt>
                        <dd className="font-semibold text-zinc-900 admin-dark:text-zinc-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Answer sheet */}
                <section className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">
                      Answer Sheet ({detail.questions.length} questions)
                    </h3>
                  </div>
                  <ol className="mt-2 space-y-3">
                    {detail.questions.map((question) => (
                      <li
                        key={question.questionId}
                        className={`rounded-xl border p-4 ${
                          question.status === "correct"
                            ? "border-emerald-500/40"
                            : question.status === "wrong"
                              ? "border-red-500/40"
                              : "border-neutral-200 admin-dark:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                            Question {String(question.order).padStart(2, "0")}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                              question.status === "correct"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : question.status === "wrong"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-zinc-500/10 text-zinc-500"
                            }`}
                          >
                            {question.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-800 admin-dark:text-zinc-200">
                          {question.question}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs">
                          {question.options.map((option, index) => (
                            <li
                              key={`${question.questionId}-${index}`}
                              className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                                index === question.correctAnswer
                                  ? "bg-emerald-500/10 font-bold text-emerald-700 admin-dark:text-emerald-400"
                                  : index === question.studentAnswer
                                    ? "bg-red-500/10 font-bold text-red-600"
                                    : "text-zinc-600 admin-dark:text-zinc-300"
                              }`}
                            >
                              <span className="font-extrabold">
                                {OPTION_LETTERS[index] ?? index + 1}.
                              </span>
                              <span>{option}</span>
                              {index === question.correctAnswer && (
                                <span className="ml-auto text-[10px] uppercase">Correct answer</span>
                              )}
                              {index === question.studentAnswer &&
                                index !== question.correctAnswer && (
                                  <span className="ml-auto text-[10px] uppercase">Student answer</span>
                                )}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold">
                          <span className="text-zinc-500">
                            Student Answer:{" "}
                            <span className="text-zinc-900 admin-dark:text-zinc-200">
                              {question.studentAnswer == null
                                ? "Not Answered"
                                : OPTION_LETTERS[question.studentAnswer] ?? question.studentAnswer + 1}
                            </span>
                          </span>
                          <span className="text-zinc-500">
                            Correct Answer:{" "}
                            <span className="text-zinc-900 admin-dark:text-zinc-200">
                              {OPTION_LETTERS[question.correctAnswer] ?? question.correctAnswer + 1}
                            </span>
                          </span>
                          <span className="text-zinc-500">
                            Marks:{" "}
                            <span
                              className={
                                question.obtained > 0
                                  ? "text-emerald-600"
                                  : question.obtained < 0
                                    ? "text-red-500"
                                    : "text-zinc-900 admin-dark:text-zinc-200"
                              }
                            >
                              {question.obtained > 0 ? "+" : ""}
                              {question.obtained}
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
