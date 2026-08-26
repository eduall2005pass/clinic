"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  cardClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
} from "@/components/admin/admin-ui";

type Summary = {
  examId: string;
  title: string;
  categoryName: string | null;
  participants: number;
  totalMarks: number;
  durationMinutes: number;
  scheduledAt: string | null;
  lastSubmittedAt: string | null;
  highestMark: number | null;
};

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

/**
 * Admin → Result Control → Public Exam Result.
 * Lists every conducted Public Exam (≥1 submitted result). Course Exam
 * results are NOT shown here — that flow stays in its own section.
 */
export default function PublicExamResultListPage() {
  const gate = useAdminGate();
  const [exams, setExams] = useState<Summary[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setExams(null);
    try {
      const response = await fetch("/api/admin/exams/public-results", {
        cache: "no-store",
        headers: gate.headers,
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = (await response.json()) as { exams?: Summary[] };
      setExams(data.exams ?? []);
    } catch {
      setError(true);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard admin gate load
      void load();
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage
        title="Administrators only"
        message="Result control is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    ) : (
      <AccessLoading label="Loading Public Exam results…" />
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          <Link href="/admin/result-control" className="transition hover:text-primary-600">
            Result Control
          </Link>
          <span aria-hidden="true">→</span>
          <span className="text-zinc-900 admin-dark:text-zinc-100">Public Exam Result</span>
        </nav>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Public Exam Result
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          All conducted public exams with their participants, merit lists and
          answer sheets.
        </p>
      </header>

      {exams === null && !error && (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>
          Loading…
        </p>
      )}

      {error && exams === null && (
        <div className={`${cardClass} mt-5 p-6 text-center`}>
          <p className="text-sm font-semibold text-red-500">Something went wrong.</p>
          <button type="button" onClick={() => void load()} className={`${buttonSecondaryClass} mt-3`}>
            Try Again
          </button>
        </div>
      )}

      {exams !== null && exams.length === 0 && !error && (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>
          No Public Exam Results Available
        </p>
      )}

      {exams !== null && exams.length > 0 && (
        <ul className="mt-5 space-y-3">
          {exams.map((exam) => (
            <li key={exam.examId} className={`${cardClass} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold text-zinc-900 admin-dark:text-zinc-100">
                      {exam.title}
                    </h2>
                    {exam.categoryName && (
                      <span className="rounded-full bg-primary-600/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-600">
                        {exam.categoryName}
                      </span>
                    )}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-zinc-500 sm:grid-cols-4">
                    <div>
                      <dt className="uppercase tracking-wide text-[10px]">Participants</dt>
                      <dd className="text-zinc-900 admin-dark:text-zinc-200">{exam.participants}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-[10px]">Date</dt>
                      <dd className="text-zinc-900 admin-dark:text-zinc-200">
                        {formatDate(exam.scheduledAt ?? exam.lastSubmittedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-[10px]">Total Marks</dt>
                      <dd className="text-zinc-900 admin-dark:text-zinc-200">{exam.totalMarks}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-[10px]">Duration</dt>
                      <dd className="text-zinc-900 admin-dark:text-zinc-200">{exam.durationMinutes} min</dd>
                    </div>
                  </dl>
                </div>
                <Link
                  href={`/admin/result-control/public-exam/${encodeURIComponent(exam.examId)}`}
                  className={buttonPrimaryClass}
                >
                  View Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
