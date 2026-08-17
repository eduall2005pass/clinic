"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCourse, getPayableFee } from "@/lib/courses";
import type { Enrollment } from "@/lib/enrollments";

const statusStyles: Record<string, string> = {
  active: "bg-primary-600/15 text-primary-400 border-primary-500/40",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

function formatDate(value: unknown): string {
  if (!value) return "";
  const timestamp = value as { toDate?: () => Date };
  if (typeof timestamp.toDate !== "function") return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp.toDate());
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const course = getCourse(enrollment.courseId);
  const statusLabel =
    enrollment.enrollmentStatus === "active"
      ? "Active"
      : enrollment.enrollmentStatus === "pending"
        ? "Pending"
        : "Completed";

  return (
    <article className="flex flex-col rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[enrollment.enrollmentStatus] ?? "border-ink/10 bg-ink/5 text-neutral-300"}`}
        >
          {statusLabel}
        </span>
        <span className="rounded-full border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400">
          {enrollment.courseKind === "paid" ? "Paid Course" : "Free Course"}
        </span>
        <span className="rounded-full border border-ink/10 bg-ink/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
          {enrollment.courseType}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-heading">
        {enrollment.courseName}
      </h2>

      <div className="mt-3 flex items-center gap-6 text-sm text-neutral-400">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Fee
          </p>
          <p className="mt-0.5 font-bold text-primary-500">
            {course
              ? `৳ ${getPayableFee(course).toLocaleString("en-IN")}`
              : "—"}
          </p>
        </div>
        {enrollment.enrollmentDate ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Enrolled
            </p>
            <p className="mt-0.5 font-semibold text-neutral-300">
              {formatDate(enrollment.enrollmentDate)}
            </p>
          </div>
        ) : null}
      </div>

      {enrollment.enrollmentStatus === "pending" && (
        <p className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-relaxed text-yellow-200/80">
          Your enrollment is pending payment/approval. It will become active
          once the payment or approval is completed.
        </p>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        <Link
          href={`/courses/${enrollment.courseId}`}
          className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          Open Course
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-center text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
        >
          Dashboard
        </Link>
      </div>
    </article>
  );
}

export default function EnrolledCoursesList() {
  const { enrollments } = useAuth();

  const visible = enrollments.filter(
    (enrollment) => enrollment.enrollmentStatus !== "cancelled",
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">
            My Enrolled Courses
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Courses you are actively enrolled in and pending requests.
          </p>
        </div>
        <Link
          href="/courses"
          className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
        >
          Explore Courses
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No enrollments yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">
            Enroll in a course from the course catalog and it will appear here.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
          >
            Explore Courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((enrollment) => (
            <EnrollmentCard key={enrollment.courseId} enrollment={enrollment} />
          ))}
        </div>
      )}
    </section>
  );
}