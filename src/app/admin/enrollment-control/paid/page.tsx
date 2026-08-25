"use client";

import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  ControlCourseCard,
  useControlCourses,
} from "@/components/admin/EnrollmentControlShared";

/**
 * Paid Course Enrollment — manual enrollment only (NO auto-enrollment).
 * Every paid course opens its own applications page.
 */
export default function PaidEnrollmentPage() {
  const toast = useAdminToast();
  void toast;
  const { authLoading } = useAuth();
  const { courses, error } = useControlCourses();

  if (authLoading) return <AccessLoading label="Loading…" />;

  const paidCourses = (courses ?? []).filter((course) => course.kind === "paid");

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Paid Course Enrollment</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manual enrollment only — review and accept paid course applications.
      </p>

      <h2 className="mt-8 text-lg font-bold text-heading">Manual Enrollment</h2>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load the course list.
        </p>
      ) : courses === null ? (
        <AccessLoading label="Loading paid courses…" />
      ) : paidCourses.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No paid courses published yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {paidCourses.map((course) => (
            <ControlCourseCard key={course.slug} course={course} kind="paid" />
          ))}
        </div>
      )}
    </section>
  );
}
