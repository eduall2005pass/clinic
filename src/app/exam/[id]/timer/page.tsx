"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import TimerSelection from "@/components/TimerSelection";
import type { PublicExam } from "@/lib/public-exams";

type ExamData = {
  exam: PublicExam | null;
  hasPriorAttempt: boolean;
  error?: string;
};

export default function TimerSelectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user, authLoading, profileLoading, profile } = useAuth();
  const [examId, setExamId] = useState<string | null>(null);
  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    void params.then((p) => setExamId(p.id));
  }, [params]);

  // Fetch exam data + check prior attempt
  useEffect(() => {
    if (authLoading || profileLoading || !user || !examId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        // Fetch exam details by exact Exam ID — the primary identifier throughout the flow
        const examRes = await fetch(`/api/exams/${encodeURIComponent(examId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        const examData = (await examRes.json().catch(() => ({}))) as {
          exam?: { id: string; title: string };
          error?: string;
        };
        if (!examRes.ok) {
          if (!cancelled) {
            setData({ exam: null, hasPriorAttempt: false, error: examData.error ?? "Exam not found." });
          }
          return;
        }

        // Check prior attempt — use dedicated prior-attempt endpoint (exam ID is the primary identifier)
        const priorRes = await fetch(
          `/api/exams/${encodeURIComponent(examId)}/prior-attempt`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: "no-store",
          },
        );
        const priorData = (await priorRes.json().catch(() => ({}))) as {
          hasPriorAttempt?: boolean;
          exam?: {
            id: string;
            name: string;
            secondTimerEnabled?: boolean;
            secondTimerDeduction?: number;
          };
          error?: string;
        };

        if (cancelled) return;

        // Use exam's Second Timer config from prior-attempt response (dynamic, not hard-coded)
        const secondEnabled = Boolean(priorData.exam?.secondTimerEnabled);
        const secondDeduction =
          typeof priorData.exam?.secondTimerDeduction === "number" && Number.isFinite(priorData.exam.secondTimerDeduction)
            ? Number(priorData.exam!.secondTimerDeduction)
            : 3;

        // When Second Timer is NOT enabled, no selection is needed — go straight to exam.
        // When enabled, always show Timer Type selection (First vs Second) — penalty only if Second is explicitly selected.
        if (!secondEnabled) {
          if (!priorData.hasPriorAttempt) {
            router.replace(`/exam/${examId}?begin=1&timer=first`);
            return;
          }
          // Even with prior attempt but no second timer, no penalty — start as First Timer
          router.replace(`/exam/${examId}?begin=1&timer=first`);
          return;
        }

        setData({
          exam: examData.exam
            ? {
                id: examData.exam.id,
                name: examData.exam.title,
                description: null,
                bannerUrl: null,
                batch: "",
                courseType: "Academic" as const,
                subject: "",
                totalMarks: 0,
                totalQuestions: 0,
                durationMinutes: 0,
                negativeMarks: 0,
                negativeEnabled: false,
                negativePerWrong: 0,
                scheduledAt: null,
                endsAt: null,
                examDate: "",
                examTime: "",
                status: "Live" as const,
                published: true,
                secondTimerEnabled: secondEnabled,
                secondTimerDeduction: secondDeduction,
                eligibility: { mode: "all" as const, rules: [] },
              }
            : null,
          hasPriorAttempt: Boolean(priorData.hasPriorAttempt),
          error: examData.error,
        });
      } catch {
        if (!cancelled) {
          setData({ exam: null, hasPriorAttempt: false, error: "Failed to load exam." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profileLoading, user, examId, router]);

  if (authLoading || profileLoading) {
    return <AccessLoading label="Checking access..." />;
  }

  if (!user) {
    return (
      <AccessMessage
        title="Login Required"
        message="You must be logged in to start an exam."
        actionLabel="Login to Start Exam"
        actionHref={`/login?next=${encodeURIComponent(`/exam/${examId}/rules`)}`}
      />
    );
  }

  if (!profile) {
    return (
      <AccessMessage
        title="Registration Required"
        message="You must complete your student registration to start an exam."
        actionLabel="Complete Registration"
        actionHref="/register"
      />
    );
  }

  if (loading) {
    return (
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <AccessLoading label="Loading..." />
        </section>
      </main>
    );
  }

  if (data?.error || !data?.exam) {
    return (
      <main className="flex-1 bg-dark-950">
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="font-semibold text-red-400">
              {data?.error || "Exam not found."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const exam = data.exam;

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Exam header */}
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
          <div className="relative h-36 w-full bg-gradient-to-br from-primary-600/30 via-dark-900 to-dark-950 sm:h-48">
            {exam.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exam.bannerUrl}
                alt={`${exam.name} banner`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="rounded-xl border border-primary-500/40 bg-dark-950/70 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-primary-300">
                  Public Exam
                </span>
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <h1 className="text-xl font-extrabold leading-snug text-heading sm:text-2xl">
              {exam.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-neutral-400">
              <span>{exam.totalQuestions} Questions</span>
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

        {/* Timer selection */}
        <div className="mt-6">
          <TimerSelection
            examId={exam.id}
            secondTimerEnabled={exam.secondTimerEnabled}
            secondTimerDeduction={exam.secondTimerDeduction}
            hasPriorAttempt={data.hasPriorAttempt}
          />
        </div>
      </section>
    </main>
  );
}
