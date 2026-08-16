import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import PublicExamList from "@/components/PublicExamList";
import { publishedExams, batches } from "@/lib/public-exams";

export const metadata: Metadata = {
  title: "Public Exam",
  description:
    "MediSpark public exams — model tests and mock exams for HSC academic and medical admission students.",
};

export default function ExamPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Public Exam"
        description="Take public model tests and mock exams designed for HSC academics and medical admission. Only published exams are listed here."
      />

      <PublicExamList exams={publishedExams} batches={batches} />

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
          <p className="font-semibold text-primary-800">
            The full exam system is coming soon.
          </p>
          <p className="mt-1 text-sm text-primary-700">
            Questions, timer, marking and results will be added in upcoming
            steps. You must be logged in to start an exam.
          </p>
        </div>
      </section>
    </main>
  );
}