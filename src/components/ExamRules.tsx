"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ExamRulesData = {
  name: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  negativeMarks: number;
};

export type ExamRule = {
  title: string;
  detail: string;
};

/**
 * Dynamically builds the rules for one specific exam according to its
 * settings — marking, negative marking, answer locking, submission and
 * auto-submit behaviour all follow the same rules the server enforces.
 */
export function buildExamRules(exam: ExamRulesData): ExamRule[] {
  const rules: ExamRule[] = [
    {
      title: "Duration",
      detail: `You will get ${exam.durationMinutes} minute${exam.durationMinutes === 1 ? "" : "s"}. A countdown timer starts as soon as you begin.`,
    },
    {
      title: "Total Questions",
      detail:
        exam.totalQuestions > 0
          ? `${exam.totalQuestions} MCQ question${exam.totalQuestions === 1 ? "" : "s"} in this exam.`
          : "The number of questions is set by the examiner.",
    },
    {
      title: "Total Marks",
      detail: `This exam carries ${exam.totalMarks} mark${exam.totalMarks === 1 ? "" : "s"} in total. Each question shows its own marks.`,
    },
    {
      title: "Marking System",
      detail:
        "Every correct answer earns the full marks of that question. Unanswered questions score zero.",
    },
  ];

  if (exam.negativeMarks > 0) {
    rules.push({
      title: "Negative Marking",
      detail: `This exam has negative marking — each wrong answer deducts ${exam.negativeMarks} mark${exam.negativeMarks === 1 ? "" : "s"}. Answer carefully!`,
    });
  } else {
    rules.push({
      title: "Negative Marking",
      detail: "No negative marking for this exam — wrong answers cost nothing.",
    });
  }

  rules.push(
    {
      title: "Answer Selection Rules",
      detail:
        "Select ONE option per question. An answer is locked immediately after selection — you cannot change or clear it. You may answer questions in any order and return to skipped ones before submitting.",
    },
    {
      title: "Submission Rules",
      detail:
        "Answer all questions on this single scrollable paper, then click Submit Exam. Your result is calculated and shown instantly after submission.",
    },
    {
      title: "Auto-Submit Rules",
      detail:
        "When the timer reaches zero the exam auto-submits your locked answers. If the exam is interrupted (tab closed / page left), everything already answered is auto-submitted too. Starting the exam on another device ends this session and submits it automatically.",
    },
    {
      title: "Answer Key",
      detail:
        "Correct answers stay hidden during the exam. After submission you can open the answer script from your result card to compare your answers with the correct ones.",
    },
  );

  return rules;
}

function RulesIcon({ index }: { index: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-xs font-extrabold text-primary-300">
      {index + 1}
    </span>
  );
}

export function ExamRulesList({ exam }: { exam: ExamRulesData }) {
  const rules = buildExamRules(exam);
  return (
    <ul className="space-y-3">
      {rules.map((rule, index) => (
        <li
          key={rule.title}
          className="flex gap-3 rounded-xl border border-ink/10 bg-dark-850 p-3.5"
        >
          <RulesIcon index={index} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-heading">{rule.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-400 sm:text-sm">
              {rule.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Exam Rules modal — opened when a student taps Start Now / Start Exam.
 * The exam only begins after [I Understand & Start Exam] is pressed.
 */
export function ExamRulesModal({
  open,
  exam,
  onClose,
  onStart,
}: {
  open: boolean;
  exam: ExamRulesData;
  onClose: () => void;
  onStart: () => void;
}) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => {
    setPortalMounted(true);
    return () => setPortalMounted(false);
  }, []);
  if (!portalMounted) return null;

  if (!open) return null;

    // Portal to <body>: ancestor transforms break position:fixed on desktop.

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Exam rules — ${exam.name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-ink/10 bg-dark-900 shadow-2xl shadow-black/50 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Drag handle (mobile sheet look) */}
        <div className="sticky top-0 z-10 flex flex-col items-center gap-2 border-b border-ink/10 bg-dark-900 px-5 pb-4 pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-neutral-600" />
          <h2 className="text-base font-extrabold text-heading">Exam Rules</h2>
        </div>

        <div className="p-5 sm:p-6">
          <div className="hidden items-center justify-between sm:flex">
            <h2 className="text-lg font-extrabold text-heading">Exam Rules</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close exam rules"
              className="rounded-full bg-dark-800 p-2 text-neutral-400 transition hover:text-heading"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <p className="mt-3 rounded-xl border border-primary-600/30 bg-primary-600/10 px-4 py-3 text-sm font-bold text-primary-200">
            {exam.name}
          </p>

          <div className="mt-4">
            <ExamRulesList exam={exam} />
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            The timer starts as soon as you press the button below.
          </p>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-ink/10 bg-dark-850 px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-ink/20 hover:text-heading active:scale-[0.98]"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-500 active:scale-[0.98]"
            >
              I Understand &amp; Start Exam →
            </button>
          </div>
        </div>
      </div>
    </div>,
  document.body);
}
