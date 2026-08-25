import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchExamPageById } from "@/lib/public-exams-server";
import ExamParticipationArea from "@/components/auth/ExamParticipationArea";

export const dynamic = "force-dynamic";

type ExamPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ begin?: string }>;
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

export default async function ExamDetailPage({ params, searchParams }: ExamPageProps) {
  const { id } = await params;
  const { begin } = await searchParams;
  const exam = await fetchExamPageById(id);

  if (!exam) {
    notFound();
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:max-w-4xl">
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
          {/* begin=1 → the student already accepted the Exam Rules on the
              card's modal, so the attempt may start immediately. */}
          <ExamParticipationArea examId={exam.id} autoBegin={begin === "1"} />
        </div>
      </section>
    </main>
  );
}
