import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicExamList from "@/components/PublicExamList";
import {
  examCategories,
  batches,
  type ExamCategory,
} from "@/lib/public-exams";
import {
  fetchPublicExams,
  resolveExamCategoryId,
} from "@/lib/public-exams-server";

export const dynamic = "force-dynamic";

const categoryMeta: Record<
  ExamCategory,
  { description: string }
> = {
  "ssc-academic": {
    description:
      "SSC academic model tests — live, upcoming and previous exams in one place.",
  },
  "hsc-academic": {
    description:
      "HSC academic model tests — live, upcoming and previous exams in one place.",
  },
  "medical-admission": {
    description:
      "Medical admission mock exams — live, upcoming and previous in one place.",
  },
  "varsity-admission": {
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
  const valid = examCategories.find((item) => item.key === category);
  if (!valid) return { title: "Exam Category Not Found" };
  return { title: valid.label, description: categoryMeta[valid.key].description };
}

export default async function ExamCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const valid = examCategories.find((item) => item.key === category);
  if (!valid) {
    notFound();
  }

  // Resolve the URL key to its real Course Control category id, then fetch
  // ONLY that category's exams (SQL WHERE category_id = ?). Admin-created
  // exams appear here automatically — no heuristic matching.
  const categoryId = await resolveExamCategoryId(valid.key);
  if (!categoryId) notFound();
  const exams = await fetchPublicExams({ categoryId });

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
          {valid.label}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {categoryMeta[valid.key].description}
        </p>
      </section>

      {/* Inside every category: Live Exams → Upcoming Exams → Previous Exams */}
      <PublicExamList
        exams={exams}
        batches={batches}
        categoryId={categoryId}
      />
    </main>
  );
}