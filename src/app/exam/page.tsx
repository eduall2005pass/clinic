import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

const examFeatures = [
  {
    title: "Model Tests",
    description:
      "Full-syllabus practice tests modeled on the medical admission exam pattern.",
  },
  {
    title: "Chapter-wise Exams",
    description:
      "Smaller tests per chapter to track understanding subject by subject.",
  },
  {
    title: "MCQ Practice",
    description:
      "Rapid-fire multiple choice practice for HSC and admission questions.",
  },
  {
    title: "Result Analysis",
    description:
      "Review your answers, weak areas, and progress over time.",
  },
];

export const metadata: Metadata = {
  title: "Exam",
  description:
    "MediSpark exam system — model tests, chapter-wise exams and MCQ practice.",
};

export default function ExamPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Exam"
        description="Practice with model tests and chapter-wise exams designed for HSC academics and medical admission. The full exam system will be added in upcoming steps."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {examFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <span className="inline-block h-2 w-10 rounded-full bg-primary-600" />
              <h3 className="mt-4 font-bold text-dark-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
          <p className="font-semibold text-primary-800">
            Exam system coming soon.
          </p>
          <p className="mt-1 text-sm text-primary-700">
            Model tests, chapter-wise exams and MCQ practice will be available
            here.
          </p>
        </div>
      </section>
    </main>
  );
}