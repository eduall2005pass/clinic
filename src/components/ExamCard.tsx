import Link from "next/link";
import {
  categorizeExam,
  type ExamCategory,
  type ExamStatus,
  type PublicExam,
} from "@/lib/public-exams";
import StartExamButton from "@/components/StartExamButton";

const statusMeta: Record<
  ExamStatus,
  { label: string; badge: string; dot: string }
> = {
  Live: {
    label: "LIVE",
    badge:
      "bg-primary-600 text-white shadow-md shadow-primary-600/50 ring-1 ring-primary-400/60",
    dot: "bg-white animate-pulse",
  },
  Upcoming: {
    label: "UPCOMING",
    badge:
      "bg-primary-500/10 text-primary-300 border border-primary-500/30",
    dot: "bg-primary-400",
  },
  Closed: {
    label: "COMPLETED",
    badge: "bg-dark-800 text-neutral-400 border border-ink/10",
    dot: "bg-neutral-500",
  },
};

function BookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function GraduationCapIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function StethoscopeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v1a4 4 0 008 0v-1m-12-6a6 6 0 0012 0V7a2 2 0 10-4 0v5a2 2 0 11-4 0V7a2 2 0 10-4 0v6z" />
    </svg>
  );
}

function BuildingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  );
}

const categoryMeta: Record<
  ExamCategory,
  { icon: (props: { className?: string }) => React.ReactElement }
> = {
  "ssc-academic": { icon: BookIcon },
  "hsc-academic": { icon: GraduationCapIcon },
  "medical-admission": { icon: StethoscopeIcon },
  "varsity-admission": { icon: BuildingIcon },
};

const categoryDescriptions: Record<ExamCategory, string> = {
  "ssc-academic":
    "Chapter-wise MCQ practice built on the latest SSC syllabus and question patterns.",
  "hsc-academic":
    "Full-length board-style MCQ exam covering the complete HSC syllabus.",
  "medical-admission":
    "Medical admission preparation with previous year questions and detailed analysis.",
  "varsity-admission":
    "University admission practice designed around the latest question trends.",
};

const actionMeta: Record<ExamStatus, { label: string }> = {
  Live: { label: "Start Now" },
  Upcoming: { label: "View Details" },
  Closed: { label: "View Result" },
};

function dateInfo(exam: PublicExam): string {
  if (!exam.examDate) return "";
  const prefix =
    exam.status === "Live"
      ? "Started"
      : exam.status === "Closed"
        ? "Ended"
        : "Scheduled";
  return exam.examTime ? `${prefix} ${exam.examDate} · ${exam.examTime}` : `${prefix} ${exam.examDate}`;
}

export default function ExamCard({ exam }: { exam: PublicExam }) {
  const status = statusMeta[exam.status];
  const action = actionMeta[exam.status];
  const category = categorizeExam(exam);
  const CategoryIcon = categoryMeta[category].icon;
  const isLive = exam.status === "Live";

  const cardClasses = isLive
    ? "border-primary-600/60 ring-1 ring-primary-600/40 shadow-xl shadow-primary-900/40 hover:border-primary-500 hover:shadow-primary-800/50"
    : "border-ink/10 shadow-lg shadow-black/20 hover:border-primary-600/50";

  const buttonClasses =
    "w-full rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.98]";

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl bg-dark-900 transition duration-300 hover:-translate-y-1 ${cardClasses}`}
    >
      <div className="flex items-center justify-between gap-3 p-5 pb-0">
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wider ${status.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
            isLive
              ? "border-primary-500/40 bg-primary-600/10 text-primary-300"
              : "border-ink/10 bg-dark-850 text-neutral-400"
          }`}
        >
          <CategoryIcon />
          {exam.courseType}
          <span className="text-neutral-500">·</span>
          {exam.batch}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3
          className={`text-lg font-bold leading-snug transition ${
            isLive
              ? "text-heading group-hover:text-primary-400"
              : "text-heading group-hover:text-primary-400"
          }`}
        >
          {exam.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400">
          {categoryDescriptions[category]}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-ink/10 bg-ink/5 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Duration
            </p>
            <p className="mt-1 text-sm font-bold text-heading">
              {exam.durationMinutes} min
            </p>
          </div>
          <div className="border-x border-ink/10 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Marks
            </p>
            <p className="mt-1 text-sm font-bold text-heading">
              {exam.totalMarks}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Participants
            </p>
            <p className="mt-1 text-sm font-bold text-heading">—</p>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <p className="mb-3 flex items-center justify-between text-xs font-medium text-neutral-500">
            <span>{dateInfo(exam) || "Schedule to be announced."}</span>
            {isLive && (
              <span className="font-bold text-primary-400">Running now</span>
            )}
          </p>

          {isLive ? (
            <StartExamButton
              exam={exam}
              className={`${buttonClasses} flex items-center justify-center gap-2 bg-primary-600 text-white shadow-md shadow-primary-900/50 hover:bg-primary-500`}
            >
              {action.label}
              <span aria-hidden="true">&rarr;</span>
            </StartExamButton>
          ) : (
            <Link
              href={`/exam/${exam.id}`}
              className={`${buttonClasses} flex items-center justify-center gap-2 ${
                exam.status === "Upcoming"
                  ? "border border-primary-600/50 bg-primary-600/10 text-primary-300 hover:bg-primary-600/20"
                  : "border border-ink/10 bg-dark-850 text-neutral-300 hover:border-ink/20 hover:text-heading"
              }`}
            >
              {action.label}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
