"use client";

import Link from "next/link";
import ExamManager, { type FixedCategory } from "@/components/admin/ExamManager";

/**
 * One Course Control category's public exam list. Reuses the SAME
 * ExamManager card/edit/question system for every category — nothing is
 * duplicated per category and no category management appears here.
 */
export default function PublicExamCategoryManager({
  category,
}: {
  category: FixedCategory;
}) {
  return (
    <div>
      <nav className="mx-auto flex max-w-4xl items-center gap-2 px-4 pt-6 text-xs font-semibold text-zinc-500 sm:px-6">
        <Link href="/admin/public-exam" className="transition hover:text-primary-600">
          Public Exam Control
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-zinc-900 admin-dark:text-zinc-100">{category.name}</span>
      </nav>
      <ExamManager
        title={`${category.name} — Public Exams`}
        description={`Only the public exams belonging to “${category.name}” are listed here. New exams created below automatically receive this category.`}
        fixedCategory={category}
      />
    </div>
  );
}
