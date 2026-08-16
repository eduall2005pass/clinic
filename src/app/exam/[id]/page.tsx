import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: "Total Marks", value: `${exam.totalMarks}` },
            { label: "Duration", value: `${exam.durationMinutes} min` },
            { label: "Status", value: exam.status },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-ink/10 bg-dark-900 p-5 text-center shadow-lg shadow-black/20"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-extrabold text-heading">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center">
          <p className="font-semibold text-primary-300">
            Exam engine coming soon.
          </p>
          <p className="mt-1 text-sm text-primary-200/70">
            Questions, timer, marking and results will be added in an upcoming
            step. This page is the entry point for the future exam system.
          </p>
        </div>
      </section>
    </main>
  );
}