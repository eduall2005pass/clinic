import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchExamPageById } from "@/lib/public-exams-server";
import { categoryLabels, type ExamCategory } from "@/lib/public-exams";
import ExamParticipationArea from "@/components/auth/ExamParticipationArea";
import ExamDetailInfo from "@/components/ExamDetailInfo";

export const revalidate = 300;

type ExamPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ begin?: string; timer?: string }>;
};

export async function generateMetadata({
  params,
}: ExamPageProps): Promise<Metadata> {
  const { id } = await params;
  const exam = await fetchExamPageById(id);

  if (!exam) {
    return { title: "Exam Not Found" };
  }

  return {
    title: exam.name,
    description: `${exam.name} — ${exam.batch}, ${exam.courseType}, ${exam.totalMarks} marks, ${exam.durationMinutes} minutes.`,
  };
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: ExamPageProps) {
  const { id } = await params;
  const { begin, timer } = await searchParams;
  const exam = await fetchExamPageById(id);

  if (!exam) {
    notFound();
  }

  const canStart = exam.status === "Live" || exam.status === "Available";

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back link */}
        <Link
          href="/exam"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          ← All Categories
        </Link>

        {/* Exam banner */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
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
            {exam.description && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                {exam.description}
              </p>
            )}
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

        {/* Exam info grid */}
        <ExamDetailInfo exam={exam} />

        <div className="mt-8">
          {/* begin=1 + timer param → the student already accepted the Exam
              Rules and selected their timer type, so start immediately. */}
          <ExamParticipationArea
            examId={exam.id}
            autoBegin={begin === "1"}
            timerType={timer === "second" ? "second" : "first"}
          />
        </div>
      </section>
    </main>
  );
}
