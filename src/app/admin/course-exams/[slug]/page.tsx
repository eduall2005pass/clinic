"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminGate, cardClass, inputClass, labelClass, buttonPrimaryClass, type Notice } from "@/components/admin/admin-ui";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import ExamManager from "@/components/admin/ExamManager";

type CourseInfo = { slug: string; name: string; category: string };

/**
 * Admin Course Exam Management — manages exams for a specific course.
 * Shows the ExamManager scoped to enrolled exams, with the course pre-assigned.
 *
 * Route: /admin/course-exams/[slug]
 */
export default function CourseExamAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const gate = useAdminGate();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gate.ready) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/courses?category=`,
          { cache: "no-store", headers: gate.headers },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { courses?: Array<{ slug: string; name: string; category: string }> };
        const found = data.courses?.find((c) => c.slug === slug);
        if (!cancelled && found) setCourse(found);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gate.ready, slug, gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Course exam management is restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading…" />
    );
  }

  if (loading) {
    return <AccessLoading label="Loading course…" />;
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm font-semibold text-red-400">Course not found.</p>
        <Link href="/admin/exams" className="mt-4 inline-block text-sm font-semibold text-primary-400 hover:underline">
          ← Back to Exams
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/exams"
          className="text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          ← Exams
        </Link>
        <span className="text-neutral-600">/</span>
        <h1 className="text-2xl font-extrabold text-heading">Course Exams</h1>
      </div>

      {/* Course info card */}
      <div className={`mt-6 ${cardClass} p-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-block rounded-md border border-violet-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-violet-400">
            {course.category}
          </span>
          <h2 className="text-lg font-bold text-heading">{course.name}</h2>
          <span className="text-xs text-neutral-500">({course.slug})</span>
        </div>
        <p className="mt-2 text-sm text-neutral-400">
          Manage exams for this course. Exams are linked to chapters and accessible only to enrolled students.
        </p>
      </div>

      {/* Exam Manager — scoped to enrolled exams */}
      <div className="mt-6">
        <ExamManager
          title={`Exams — ${course.name}`}
          description="Create and manage course exams. Link them to chapters for structured access."
          kindFilter="enrolled"
          allowEnrolled={true}
        />
      </div>
    </section>
  );
}
