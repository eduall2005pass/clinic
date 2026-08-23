import type { Metadata } from "next";
import PublicExamList from "@/components/PublicExamList";
import MyEnrolledExams from "@/components/MyEnrolledExams";
import { fetchPublicExams, batches } from "@/lib/public-exams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Exam",
  description:
    "MediSpark public exams — model tests and mock exams for HSC academic and medical admission students.",
};

export default async function ExamPage() {
  const exams = await fetchPublicExams();

  return (
    <main className="flex-1 bg-dark-950">
      <MyEnrolledExams />
      <PublicExamList exams={exams} batches={batches} />

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center">
          <p className="font-semibold text-primary-300">
            The full exam system is coming soon.
          </p>
          <p className="mt-1 text-sm text-primary-200/70">
            Questions, timer, marking and results will be added in upcoming
            steps. You must be logged in to start an exam.
          </p>
        </div>
      </section>
    </main>
  );
}
