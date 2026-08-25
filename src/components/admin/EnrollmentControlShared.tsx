"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export type ControlCourse = {
  slug: string;
  name: string;
  category: string;
  kind: "free" | "paid";
  fee: number;
  pendingCount: number;
  totalApplications: number;
};

/** Live course list + per-course pending application counts (MySQL). */
export function useControlCourses() {
  const { user, authLoading } = useAuth();
  const [courses, setCourses] = useState<ControlCourse[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/enrollment-control/summary", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { courses?: ControlCourse[] };
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setError(false);
    } catch {
      setError(true);
    }
  }, [user]);

  // Refresh every 30s so a new application raises its badge automatically.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [user, load]);

  return { courses, error, authLoading, reload: load };
}

/** Course card with a course-specific pending-applications badge. */
export function ControlCourseCard({
  course,
  kind,
}: {
  course: ControlCourse;
  kind: "free" | "paid";
}) {
  return (
    <Link
      href={`/admin/enrollment-control/course/${encodeURIComponent(course.slug)}?kind=${kind}`}
      className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-5"
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-xl"
      >
        {kind === "paid" ? "💳" : "🆓"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-heading transition group-hover:text-primary-400 sm:text-base">
          {course.name}
        </p>
        <p className="truncate text-[11px] text-neutral-500">
          {[course.category, kind === "paid" && course.fee > 0 ? `৳${course.fee}` : "Free"]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {course.pendingCount > 0 ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          {course.pendingCount} pending
        </span>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="h-4 w-4 shrink-0 text-neutral-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </Link>
  );
}
