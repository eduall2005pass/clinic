import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publishedExams } from "@/lib/public-exams";
import ExamParticipationArea from "@/components/auth/ExamParticipationArea";

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

        <div className="mt-8">
          <ExamParticipationArea examId={exam.id} />
        </div>
      </section>
    </main>
  );
}