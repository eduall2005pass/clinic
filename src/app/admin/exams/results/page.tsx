"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  cardClass,
  buttonSecondaryClass,
} from "@/components/admin/admin-ui";

type Exam = { id: string; title: string };
type Result = {
  id: number;
  examId: string;
  studentUid: string;
  studentName: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
  meritPosition?: number | null;
  timeTakenSeconds?: number | null;
};

function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export default function ResultsPage() {
  const gate = useAdminGate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);

  const loadResults = useCallback(async (id: string) => {
    setResults(null);
    try {
      const query = id ? `?examId=${encodeURIComponent(id)}` : "";
      const response = await fetch(`/api/admin/exams/results${query}`, {
        cache: "no-store",
        headers: gate.headers,
      });
      const data = (await response.json()) as { results?: Result[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/exams", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { exams?: Exam[] }) => setExams(data.exams ?? []))
      .catch(() => setExams([]));
  }, [gate.ready]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(() => loadResults(examId));
  }, [gate.ready, examId, loadResults]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading results…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Results</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Submitted exam results by students.</p>
      </header>

      <div className={`${cardClass} mt-5 p-4`}>
        <label htmlFor="res-exam" className="sr-only">Filter by exam</label>
        <select id="res-exam" value={examId}
          onChange={(event) => setExamId(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm admin-dark:border-zinc-700 admin-dark:bg-zinc-800">
          <option value="">All exams</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>{exam.title}</option>
          ))}
        </select>
      </div>

      {results === null ? (
        <p className={`${cardClass} mt-4 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : results.length === 0 ? (
        <p className={`${cardClass} mt-4 p-8 text-center text-sm text-zinc-500`}>No results yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {results.map((result) => (
            <li key={result.id} className={`${cardClass} flex flex-wrap items-center gap-3 px-4 py-3`}>
              {result.meritPosition != null && (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    result.meritPosition === 1
                      ? "bg-amber-400/20 text-amber-600"
                      : result.meritPosition === 2
                        ? "bg-zinc-500/15 text-zinc-600"
                        : result.meritPosition === 3
                          ? "bg-orange-500/15 text-orange-600"
                          : "bg-zinc-500/10 text-zinc-500"
                  }`}
                  title="Merit position"
                >
                  #{result.meritPosition}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                  {result.studentName || result.studentUid}
                </span>
                <span className="block text-xs text-zinc-500">
                  {exams.find((exam) => exam.id === result.examId)?.title ?? result.examId} ·{" "}
                  {new Date(result.submittedAt).toLocaleString()}
                  {result.timeTakenSeconds != null && ` · ⏱ ${formatTime(result.timeTakenSeconds)}`}
                </span>
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                result.totalMarks > 0 && result.score / result.totalMarks >= 0.6
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-500"
              }`}>
                {result.score}/{result.totalMarks}
              </span>
              <button
                type="button"
                onClick={() =>
                  void fetch("/api/admin/exams/results", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json", ...gate.headers },
                    body: JSON.stringify({ id: result.id }),
                  }).then(() => loadResults(examId))
                }
                className={buttonSecondaryClass}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
