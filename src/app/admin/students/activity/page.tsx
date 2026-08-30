"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Student = {
  uid: string;
  fullName?: string;
  name?: string;
  email?: string;
  createdAt?: string | null;
};

type Enrollment = {
  id: number;
  studentName?: string;
  studentEmail?: string;
  courseName: string;
  status: string;
  enrolledAt?: number | string | null;
};

type ExamResult = {
  id: number;
  studentName?: string;
  examId?: string;
  score: number;
  totalMarks: number;
  submittedAt?: string | null;
};

type FeedItem = {
  kind: "registration" | "enrollment" | "exam";
  whenMs: number | null;
  title: string;
  detail: string;
};

function fmt(whenMs: number | null): string {
  if (whenMs === null) return "";
  return new Date(whenMs).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Admin → Students → Activity. A real activity feed composed from live
 * MySQL data: recent registrations, course enrollments and exam submissions.
 */
export default function StudentActivityPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const auth = { Authorization: `Bearer ${await user.getIdToken()}` };
      const [studentsRes, enrollmentsRes, resultsRes] = await Promise.all([
        fetch("/api/admin/students?status=all", { headers: auth, cache: "no-store" }),
        fetch("/api/admin/enrollments?status=all", { headers: auth, cache: "no-store" }),
        fetch("/api/admin/exams/results", { headers: auth, cache: "no-store" }),
      ]);
      if (!studentsRes.ok || !enrollmentsRes.ok) {
        throw new Error("failed");
      }
      const studentsData = (await studentsRes.json()) as { students?: Student[] };
      const enrollmentsData = (await enrollmentsRes.json()) as {
        enrollments?: Enrollment[];
      };
      let latestResults: ExamResult[] = [];
      if (resultsRes.ok) {
        const data = (await resultsRes.json()) as { results?: ExamResult[] };
        latestResults = Array.isArray(data.results) ? data.results : [];
      }

      const items: FeedItem[] = [];
      for (const student of studentsData.students ?? []) {
        items.push({
          kind: "registration",
          whenMs: student.createdAt ? Date.parse(student.createdAt) : null,
          title: `${student.fullName || student.name || student.email} registered`,
          detail: student.email ?? "",
        });
      }
      for (const enrollment of enrollmentsData.enrollments ?? []) {
        items.push({
          kind: "enrollment",
          whenMs:
            enrollment.enrolledAt != null
              ? new Date(enrollment.enrolledAt).getTime()
              : null,
          title: `${enrollment.studentName ?? "Student"} → ${enrollment.courseName}`,
          detail: `Enrollment ${enrollment.status}`,
        });
      }
      for (const result of latestResults.slice(0, 100)) {
        items.push({
          kind: "exam",
          whenMs: result.submittedAt ? Date.parse(result.submittedAt) : null,
          title: `${result.studentName ?? "Student"} submitted an exam`,
          detail: `Score ${result.score}/${result.totalMarks}${result.examId ? ` · exam ${result.examId}` : ""}`,
        });
      }
      items.sort((a, b) => (b.whenMs ?? 0) - (a.whenMs ?? 0));
      setFeed(items.slice(0, 200));
    } catch {
      setLoadError(true);
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  if (authLoading || loading) {
    return <AccessLoading label="Loading student activity…" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Student Activity</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Live feed — registrations, course enrollments and exam submissions.
      </p>

      {loadError ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Failed to load the activity feed.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd]"
          >
            Retry
          </button>
        </div>
      ) : feed.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No student activity recorded yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {feed.map((item, index) => (
            <li
              key={`${item.kind}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] px-4 py-3"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  item.kind === "registration"
                    ? "bg-sky-500/15 text-sky-300"
                    : item.kind === "enrollment"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-violet-500/15 text-violet-300"
                }`}
              >
                {item.kind}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">{item.title}</p>
                <p className="truncate text-[11px] text-neutral-500">{item.detail}</p>
              </div>
              <span className="shrink-0 text-[11px] text-neutral-500">{fmt(item.whenMs)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
