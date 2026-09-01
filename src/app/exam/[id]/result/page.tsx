import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchExamPageById } from "@/lib/public-exams-server";
import ExamResultClient from "@/components/exam/ExamResultClient";

export const dynamic = "force-dynamic";

type ResultPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ResultPageProps): Promise<Metadata> {
  const { id } = await params;
  const exam = await fetchExamPageById(id);
  return {
    title: exam ? `Result — ${exam.name}` : "Exam Result",
    description: exam ? `Result for ${exam.name}` : "Exam result",
  };
}

/**
 * Student Result Card — immediately after submission (MASTER PROMPT §18).
 * Shows Student Name, Student ID, Exam Name, Total Questions, Total Marks,
 * Correct/Wrong/Unanswered, Correct Marks, Negative Marking, Second Timer
 * Penalty, Final Marks, Time Taken, Submission Status, Merit Position/Rank —
 * all from the common scoring service (exam_results + exam_questions).
 * Also provides View Answer Sheet via getExamResultScript.
 */
export default async function ExamResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const exam = await fetchExamPageById(id);
  if (!exam) notFound();
  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <ExamResultClient examId={exam.id} examName={exam.name} />
      </section>
    </main>
  );
}
