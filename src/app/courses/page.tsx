import type { Metadata } from "next";
import CategoryCard from "@/components/CategoryCard";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Explore MediSpark courses — HSC academic subjects and medical admission preparation programs.",
};

const iconProps = {
  className: "h-8 w-8",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

export default function CoursesPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Explore Programs
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading sm:text-4xl">
            Choose Your Path
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
            Select a program to browse batch-wise courses built for HSC board
            exam success and medical admission preparation.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <CategoryCard
            href="/courses/academic"
            title="Academic Courses"
            description="Complete HSC academic preparation — every subject with batch-wise courses and board exam-focused explanations."
            icon={
              <svg {...iconProps}>
                <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
          <CategoryCard
            href="/courses/admission"
            title="Admission Courses"
            description="Focused medical admission preparation — combined syllabus training with exam strategy for the medical entrance race."
            icon={
              <svg {...iconProps}>
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4" />
                <circle cx="20" cy="10" r="2" />
              </svg>
            }
          />
        </div>
      </section>
    </main>
  );
}