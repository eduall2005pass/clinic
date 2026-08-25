"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { EnrolledCourseSummary } from "@/lib/my-learning";

type LoadState = "loading" | "error" | "ready";

function EnrolledCourseCard({ course }: { course: EnrolledCourseSummary }) {
  // Only ACTIVE enrollment grants content access; pending is view-only.
  const isActive = course.enrollmentStatus === "active";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30">
      {/* Course thumbnail — consistent 16:9 ratio, rounded corners */}
      <div className="relative aspect-video w-full overflow-hidden bg-dark-800">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.imageUrl}
            alt={course.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-black text-ink/20">
            MS
          </div>
        )}
        {/* Enrollment status badge — on top of the thumbnail */}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide backdrop-blur ${
            isActive
              ? "border border-emerald-500/40 bg-dark-950/80 text-emerald-400"
              : "border border-yellow-500/40 bg-dark-950/80 text-yellow-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? "bg-emerald-400" : "animate-pulse bg-yellow-400"
            }`}
          />
          {isActive ? "Active" : "Pending"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Course name */}
        <h2 className="text-lg font-extrabold leading-snug text-heading">
          {course.name}
        </h2>

        {/* Progress — percentage + visual bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-neutral-400">Progress</span>
            <span className="text-primary-500">{course.progress.percent}% Complete</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all"
              style={{ width: `${course.progress.percent}%` }}
            />
          </div>
        </div>

        {/* Single primary action — disabled while enrollment is pending.
            Server-side, /api/my/courses/[slug] rejects non-active
            enrollment too, so the restriction is real, not just visual. */}
        <div className="mt-auto pt-5">
          {isActive ? (
            <Link
              href={`/dashboard/enrolled-courses/${encodeURIComponent(course.slug)}`}
              className="block w-full rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
            >
              View Course Content
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Enrollment pending approval"
              className="block w-full cursor-not-allowed rounded-xl border border-ink/15 bg-dark-850 px-4 py-2.5 text-center text-sm font-semibold text-neutral-500"
            >
              Approval Pending
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function EnrolledCoursesList() {
  const { user, authLoading, enrollments } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourseSummary[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/my/enrolled-courses", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        // Log the real failure for debugging before showing the friendly error.
        console.error(
          `[enrolled-courses] API ${response.status}:`,
          await response.text().catch(() => ""),
        );
        throw new Error(`API ${response.status}`);
      }
      const data = (await response.json()) as { courses?: EnrolledCourseSummary[] };
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setState("ready");
    } catch (error) {
      console.error("[enrolled-courses] load failed:", error);
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [authLoading, user, load]);

  if (authLoading || !user || state === "loading") {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-neutral-400">
          Loading your enrolled courses...
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-extrabold text-heading">My Enrolled Courses</h1>
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="font-bold text-red-300">Something went wrong</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-red-200/70">
            We could not load your enrolled courses. Please check your connection
            and try again.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // Empty state — only ever show courses the student is actually enrolled in.
  const visible = courses ?? [];
  const pendingCount = enrollments.filter(
    (enrollment) => enrollment.enrollmentStatus === "pending",
  ).length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">
            My Enrolled Courses
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {visible.length > 0
              ? `${visible.length} active course${visible.length === 1 ? "" : "s"} — continue where you left off.`
              : "Courses you are enrolled in will appear here."}
          </p>
        </div>
      </div>

      {pendingCount > 0 && (
        <p className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-relaxed text-yellow-200/80">
          You have {pendingCount} pending enrollment request{pendingCount === 1 ? "" : "s"} waiting for payment/approval.
        </p>
      )}

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto h-12 w-12 text-ink/25"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
            />
          </svg>
          <p className="mt-4 font-semibold text-heading">
            No enrolled courses yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            You have not enrolled in any course yet. Browse the catalog and
            enroll — your courses will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <EnrolledCourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}
