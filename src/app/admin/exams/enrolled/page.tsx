"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass } from "@/components/admin/admin-ui";

type Exam = { id: string; title: string };
type Enrollment = {
  id: number;
  examId: string;
  studentUid: string;
  studentName: string;
  enrolledAt: string;
};

export default function EnrolledPage() {
  const gate = useAdminGate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/exams", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { exams?: Exam[] }) => setExams(data.exams ?? []))
      .catch(() => setExams([]));
  }, [gate.ready]);

  const load = useCallback(async (id: string) => {
    setEnrollments(null);
    try {
      const query = id ? `?examId=${encodeURIComponent(id)}` : "";
      const response = await fetch(`/api/admin/exams/enrolled${query}`, {
        cache: "no-store",
        headers: gate.headers,
      });
      const data = (await response.json()) as { enrollments?: Enrollment[] };
      setEnrollments(data.enrollments ?? []);
    } catch {
      setEnrollments([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(() => load(examId));
  }, [gate.ready, examId, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading enrollments…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Enrolled Students</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Students enrolled in each exam.</p>
      </header>

      <div className={`${cardClass} mt-5 p-4`}>
        <label htmlFor="enr-exam" className="sr-only">Filter by exam</label>
        <select id="enr-exam" value={examId}
          onChange={(event) => setExamId(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm admin-dark:border-zinc-700 admin-dark:bg-zinc-800">
          <option value="">All exams</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>{exam.title}</option>
          ))}
        </select>
      </div>

      {enrollments === null ? (
        <p className={`${cardClass} mt-4 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : enrollments.length === 0 ? (
        <p className={`${cardClass} mt-4 p-8 text-center text-sm text-zinc-500`}>No enrollments yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {enrollments.map((item) => (
            <li key={item.id} className={`${cardClass} flex items-center gap-3 px-4 py-3`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                  {item.studentName || item.studentUid}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {exams.find((exam) => exam.id === item.examId)?.title ?? item.examId} ·{" "}
                  {new Date(item.enrolledAt).toLocaleString()}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
