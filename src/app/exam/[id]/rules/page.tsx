import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchExamPageById } from "@/lib/public-exams-server";
import ExamRulesGate from "@/components/ExamRulesGate";

export const dynamic = "force-dynamic";

type RulesPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RulesPageProps): Promise<Metadata> {
  const { id } = await params;
  const exam = await fetchExamPageById(id);
  return {
    title: exam ? `Rules — ${exam.name}` : "Exam Not Found",
  };
}

/**
 * Dedicated Exam Rules Page for ONE specific exam. Shown after the student
 * presses Start Exam; the attempt only begins after they agree to the rules.
 */
export default async function ExamRulesPage({ params }: RulesPageProps) {
  const { id } = await params;
  const exam = await fetchExamPageById(id);

  if (!exam) {
    notFound();
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Exam banner / header */}
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
                <span className="text-primary-300">−{exam.negativeMarks} per wrong</span>
              )}
            </div>
          </div>
        </div>

        {/* Rules + agreement (loaded dynamically from MySQL) */}
        <ExamRulesGate examId={exam.id} />
      </section>
    </main>
  );
}
