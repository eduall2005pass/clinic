"use client";

import { useRouter } from "next/navigation";
import { loginHref } from "@/lib/nav-links";

export default function StartExamButton({
  examId,
  disabled,
}: {
  examId: string;
  disabled?: boolean;
}) {
  const router = useRouter();

  const handleStart = () => {
    if (disabled) return;

    // Future: real authentication check here. For now no account system
    // exists, so every student is treated as unauthenticated and is sent
    // to the login / registration entry point before the exam opens.
    const isAuthenticated = false;

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    // Future: continue to the exam engine for this exam.
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