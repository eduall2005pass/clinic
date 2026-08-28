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

/** Live course list + per-course pending application counts (MySQL).
 *  Pass categoryId to get ONLY that Course Control category's courses. */
export function useControlCourses(categoryId = "") {
  const { user, authLoading } = useAuth();
  const [courses, setCourses] = useState<ControlCourse[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const qs = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
      const res = await fetch(`/api/admin/enrollment-control/summary${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { courses?: ControlCourse[] };
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user, categoryId]);

  // Refresh every 30s so a new application raises its badge automatically.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [user, load]);

  return { courses, error, loading, authLoading, reload: load };
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
      className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-5"
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-xl"
      >
        {kind === "paid" ? "💳" : "🆓"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-heading transition group-hover:text-[#1a3a78] sm:text-base">
          {course.name}
        </p>
        <p className="truncate text-[11px] text-neutral-500">
          {[course.category, kind === "paid" && course.fee > 0 ? `৳${course.fee}` : "Free"]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {course.pendingCount > 0 ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
          </span>
          {course.pendingCount} Pending
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-xs font-bold text-blue-400">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_2px_rgba(96,165,250,0.6)]" />
          </span>
          No Pending
        </span>
      )}
    </Link>
  );
}
