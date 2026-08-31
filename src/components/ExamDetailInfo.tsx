"use client";

import type { PublicExam, ExamStatus } from "@/lib/public-exams";

const statusStyles: Record<ExamStatus, { label: string; badge: string }> = {
  Live: {
    label: "Live",
    badge:
      "bg-primary-600 text-white shadow-md shadow-primary-600/50 ring-1 ring-primary-400/60",
  },
  Available: {
    label: "Available",
    badge:
      "bg-emerald-600 text-white shadow-md shadow-emerald-600/50 ring-1 ring-emerald-400/60",
  },
  Upcoming: {
    label: "Upcoming",
    badge: "bg-primary-500/10 text-primary-300 border border-primary-500/30",
  },
  Completed: {
    label: "Completed",
    badge: "bg-dark-800 text-neutral-400 border border-ink/10",
  },
  Expired: {
    label: "Expired",
    badge: "bg-red-500/10 text-red-400 border border-red-500/30",
  },
  Inactive: {
    label: "Inactive",
    badge: "bg-dark-800 text-neutral-500 border border-ink/10",
  },
  Unpublished: {
    label: "Draft",
    badge: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
    .toUpperCase();
}

export default function ExamDetailInfo({ exam }: { exam: PublicExam }) {
  const status = statusStyles[exam.status];

  const infoItems = [
    { label: "Exam Status", value: status.label, highlight: true },
    { label: "Category", value: exam.batch || "—" },
    { label: "Course Type", value: exam.courseType },
    { label: "Total Questions", value: `${exam.totalQuestions || "—"}` },
    { label: "Total Marks", value: `${exam.totalMarks}` },
    { label: "Duration", value: `${exam.durationMinutes} minutes` },
    {
      label: "Negative Marking",
      value: exam.negativeEnabled
        ? `−${exam.negativePerWrong} per wrong answer`
        : "Not applicable",
    },
    {
      label: "Second Timer",
      value: exam.secondTimerEnabled
        ? `Enabled (−${exam.secondTimerDeduction} marks on repeat)`
        : "Not enabled",
    },
    {
      label: "Exam Date",
      value: exam.examDate || formatDate(exam.scheduledAt),
    },
    {
      label: "Start Time",
      value: exam.examTime || formatTime(exam.scheduledAt),
    },
    {
      label: "End Time",
      value: exam.endsAt ? formatTime(exam.endsAt) : "—",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 sm:p-6">
      <h2 className="text-lg font-extrabold text-heading">Exam Details</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {infoItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-ink/10 bg-dark-850 px-4 py-3"
          >
            <span className="text-xs font-semibold text-neutral-500">
              {item.label}
            </span>
            <span
              className={`text-sm font-bold ${
                item.highlight ? "text-primary-300" : "text-heading"
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Attempt information */}
      {exam.secondTimerEnabled && (
        <div className="mt-4 rounded-xl border border-primary-500/20 bg-primary-600/5 p-4">
          <p className="text-xs font-semibold text-primary-300">
            Second Timer Notice
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            This exam has the Second Timer enabled. If you have already
            attempted this exam before, a penalty of{" "}
            <span className="font-bold text-primary-300">
              −{exam.secondTimerDeduction} marks
            </span>{" "}
            will be applied to your score. First attempts are never penalised.
          </p>
        </div>
      )}
    </div>
  );
}
