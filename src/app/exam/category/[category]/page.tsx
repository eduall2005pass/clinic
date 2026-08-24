import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicExamList from "@/components/PublicExamList";
import {
  examCategories,
  batches,
  type ExamCategory,
} from "@/lib/public-exams";
import { fetchPublicExams } from "@/lib/public-exams-server";

export const dynamic = "force-dynamic";

const categoryMeta: Record<
  ExamCategory,
  { label: string; description: string }
> = {
  "ssc-academic": {
    label: "SSC Public Exams",
    description:
      "SSC academic model tests — live, upcoming and previous exams in one place.",
  },
  "hsc-academic": {
    label: "HSC Public Exams",
    description:
      "HSC academic model tests — live, upcoming and previous exams in one place.",
  },
  "medical-admission": {
    label: "Medical Admission Public Exams",
    description:
      "Medical admission mock exams — live, upcoming and previous in one place.",
  },
  "varsity-admission": {
    label: "Varsity Admission Public Exams",
    description:
      "University admission practice exams — live, upcoming and previous in one place.",
  },
};

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const meta = categoryMeta[category as ExamCategory];
  if (!meta) return { title: "Exam Category Not Found" };
  return { title: meta.label, description: meta.description };
}

export default async function ExamCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const valid = examCategories.find((item) => item.key === category);
  if (!valid) {
    notFound();
  }

  const meta = categoryMeta[valid.key];
  const exams = await fetchPublicExams();

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <Link
          href="/exam"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          ← All Categories
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
          {meta.label}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">{meta.description}</p>
      </section>

      {/* Inside every category: Live Exams → Upcoming Exams → Previous Exams */}
      <PublicExamList
        exams={exams}
        batches={batches}
        category={valid.key}
      />
    </main>
  );
}
