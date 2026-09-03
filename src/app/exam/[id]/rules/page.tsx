import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchExamPageById } from "@/lib/public-exams-server";
import ExamRulesGate from "@/components/ExamRulesGate";

export const revalidate = 300;

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
        <ExamRulesGate examId={exam.id} />
      </section>
    </main>
  );
}
