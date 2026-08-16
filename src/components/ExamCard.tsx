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
    badge: "bg-black/40 text-white backdrop-blur border border-white/15",
    dot: "bg-white/80",
  },
  Closed: {
    badge: "bg-dark-800 text-neutral-400 border border-ink/10",
    dot: "bg-neutral-500",
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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/60 hover:shadow-primary-900/30">
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary-700 via-primary-900 to-[#0a0a0a]">
        <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-40" />
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
          <span className="rounded-md border border-ink/10 bg-dark-800 px-2 py-0.5 text-[11px] font-bold text-heading">
            {exam.batch}
          </span>
          <span className="rounded-md bg-primary-600/15 px-2 py-0.5 text-[11px] font-bold text-primary-400">
            {exam.totalMarks} Marks
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-heading transition group-hover:text-primary-400">
          {exam.name}
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-ink/10 bg-ink/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Duration
            </p>
            <p className="mt-1 font-bold text-heading">
              {exam.durationMinutes} min
            </p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-ink/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Date / Time
            </p>
            <p className="mt-1 font-bold text-heading">
              {exam.examDate} · {exam.examTime}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-5">
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