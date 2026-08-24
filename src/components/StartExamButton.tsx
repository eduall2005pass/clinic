"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ExamRulesModal, type ExamRulesData } from "@/components/ExamRules";

/**
 * Start Now / Start Exam button. Clicking it NEVER starts the exam
 * immediately — it first opens the Exam Rules modal for this specific exam.
 * The exam begins only after [I Understand & Start Exam].
 */
export default function StartExamButton({
  exam,
  disabled,
  className = "",
  children,
}: {
  exam: Pick<
    ExamRulesData,
    "name" | "courseType" | "durationMinutes" | "totalMarks" | "totalQuestions" | "negativeMarks"
  > & { id: string };
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, authLoading } = useAuth();
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleStart = () => {
    if (disabled || authLoading) return;

    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(`/exam/${exam.id}`)}`,
      );
      return;
    }

    if (!profile) {
      router.push(
        `/register?next=${encodeURIComponent(`/exam/${exam.id}`)}`,
      );
      return;
    }

    setRulesOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleStart}
        disabled={disabled}
        className={`rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-ink/10 disabled:bg-dark-800 disabled:text-neutral-500 disabled:shadow-none ${className}`}
      >
        {children ?? (disabled ? "Closed" : "Start Exam")}
      </button>

      <ExamRulesModal
        open={rulesOpen}
        exam={exam}
        onClose={() => setRulesOpen(false)}
        onStart={() => router.push(`/exam/${exam.id}?begin=1`)}
      />
    </>
  );
}
