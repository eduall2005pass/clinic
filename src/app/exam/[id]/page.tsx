import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { publishedExams } from "@/lib/public-exams";

type ExamPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ExamPageProps): Promise<Metadata> {
  const { id } = await params;
  const exam = publishedExams.find((item) => item.id === id);

  if (!exam) {
    return { title: "Exam Not Found" };
  }

  return {
    title: exam.name,
    description: `${exam.name} — ${exam.batch}, ${exam.courseType}, ${exam.totalMarks} marks, ${exam.durationMinutes} minutes.`,
  };
}

export default async function ExamDetailPage({ params }: ExamPageProps) {
  const { id } = await params;
  const exam = publishedExams.find((item) => item.id === id);

  if (!exam) {
    notFound();
  }

  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title={exam.name}
        description={`${exam.batch} · ${exam.courseType} · ${exam.totalMarks} marks · ${exam.durationMinutes} minutes · ${exam.examDate} at ${exam.examTime}`}
      />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: "Total Marks", value: `${exam.totalMarks}` },
            { label: "Duration", value: `${exam.durationMinutes} min` },
            { label: "Status", value: exam.status },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-extrabold text-dark-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
          <p className="font-semibold text-primary-800">
            Exam engine coming soon.
          </p>
          <p className="mt-1 text-sm text-primary-700">
            Questions, timer, marking and results will be added in an upcoming
            step. This page is the entry point for the future exam system.
          </p>
        </div>
      </section>
    </main>
  );
}