"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function StartExamButton({
  examId,
  disabled,
}: {
  examId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { user, profile, authLoading } = useAuth();

  const handleStart = () => {
    if (disabled || authLoading) return;

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/exam/${examId}`)}`);
      return;
    }

    if (!profile) {
      router.push(`/register?next=${encodeURIComponent(`/exam/${examId}`)}`);
      return;
    }

    router.push(`/exam/${examId}`);
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={disabled}
      className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-ink/10 disabled:bg-dark-800 disabled:text-neutral-500 disabled:shadow-none"
    >
      {disabled ? "Closed" : "Start Exam"}
    </button>
  );
}