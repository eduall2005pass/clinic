"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import ExamParticipationArea from "@/components/auth/ExamParticipationArea";

type ExamMeta = {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
};

/**
 * Course Exam page — renders the Common Exam Engine within course context.
 * Server-side access control is enforced by:
 *   /api/my/courses/[slug]/exams/[examId]
 * (checks enrollment, exam-course link, published status, time window).
 *
 * Client-side only handles display + ExamParticipationArea integration.
 */
export default function CourseExamPage() {
  const { slug, examId } = useParams<{ slug: string; examId: string }>();
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [exam, setExam] = useState<ExamMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/my/courses/${slug}/exams/${examId}`,
          {
            headers: { Authorization: `Bearer ${await user.getIdToken()}` },
            cache: "no-store",
          },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string };
          if (!cancelled) setError(data?.error ?? "Exam not available.");
          return;
        }
        const data = (await res.json()) as { exam: ExamMeta };
        if (!cancelled) setExam(data.exam);
      } catch {
        if (!cancelled) setError("Failed to load exam.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, examId, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-sm font-semibold text-red-400">{error}</p>
        <Link
          href={`/dashboard/enrolled-courses/${slug}`}
          className="mt-4 inline-block text-sm font-semibold text-primary-400 hover:underline"
        >
          ← Back to Course
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back link */}
        <Link
          href={`/dashboard/enrolled-courses/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          ← Back to Course
        </Link>

        {/* Course exam header */}
        {exam && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
            <div className="p-5 sm:p-6">
              <span className="inline-block rounded-md border border-violet-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-violet-400">
                Course Exam
              </span>
              <h1 className="mt-2 text-xl font-extrabold leading-snug text-heading sm:text-2xl">
                {exam.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-neutral-400">
                <span>{exam.totalMarks} Marks</span>
                <span>{exam.durationMinutes} min</span>
                {exam.negativeMarks > 0 && (
                  <span className="text-primary-300">
                    −{exam.negativeMarks} per wrong
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Common Exam Engine */}
        <div className="mt-8">
          <ExamParticipationArea examId={examId} />
        </div>
      </section>
    </main>
  );
}
