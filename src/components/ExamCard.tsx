import type { PublicExam, ExamStatus } from "@/lib/public-exams";
import StartExamButton from "@/components/StartExamButton";

const statusStyles: Record<
  ExamStatus,
  { badge: string; dot: string }
> = {
  Live: {
    badge: "bg-primary-600 text-white",
    dot: "bg-white animate-pulse",
  },
  Upcoming: {
    badge: "bg-black/40 text-white backdrop-blur",
    dot: "bg-white/80",
  },
  Closed: {
    badge: "bg-neutral-200 text-neutral-600",
    dot: "bg-neutral-400",
  },
};

function ClipboardIcon() {
  return (
    <svg
      className="h-12 w-12 text-white/90"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export default function ExamCard({ exam }: { exam: PublicExam }) {
  const style = statusStyles[exam.status];
  const isClosed = exam.status === "Closed";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-primary-500 hover:shadow-xl">
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary-500 via-primary-700 to-dark-900">
        <ClipboardIcon />
        <span
          className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {exam.status}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {exam.courseType}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-dark-900 px-2 py-0.5 text-[11px] font-bold text-white">
            {exam.batch}
          </span>
          <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700">
            {exam.totalMarks} Marks
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-dark-900 transition group-hover:text-primary-700">
          {exam.name}
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Duration
            </p>
            <p className="mt-1 font-bold text-dark-900">
              {exam.durationMinutes} min
            </p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Date / Time
            </p>
            <p className="mt-1 font-bold text-dark-900">
              {exam.examDate} · {exam.examTime}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5">
          <span className="text-xs font-medium text-neutral-500">
            {isClosed
              ? "This exam has ended."
              : exam.status === "Live"
                ? "Exam is running now."
                : "Open for all eligible students."}
          </span>
          <StartExamButton examId={exam.id} disabled={isClosed} />
        </div>
      </div>
    </article>
  );
}