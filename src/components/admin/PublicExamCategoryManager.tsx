"use client";

import Link from "next/link";
import ExamManager, { type FixedCategory } from "@/components/admin/ExamManager";
import { examCategoryLabel } from "@/lib/public-exams";

/**
 * One Public Exam category's exam list (Category → Exam, no Course layer).
 * Reuses the SAME ExamManager card/edit/question system for every category
 * — nothing is duplicated per category and no category management appears
 * here. The exam label never uses the word "Course".
 */
export default function PublicExamCategoryManager({
  category,
}: {
  category: FixedCategory;
}) {
  const label = examCategoryLabel(category);
  return (
    <div>
      <nav className="mx-auto flex max-w-4xl items-center gap-2 px-4 pt-6 text-xs font-semibold text-slate-500 sm:px-6">
        <Link href="/admin/public-exam" className="transition hover:text-[#1a3a78]">
          Public Exam Control
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-[#0b1e3a] admin-dark:text-zinc-100">{label}</span>
      </nav>
      <ExamManager
        title={`${label} — Public Exams`}
        description={`Only the public exams belonging to “${label}” are listed here. Every exam created with + Add Exam below automatically receives this category and appears under it on the Main Website.`}
        fixedCategory={category}
      />
    </div>
  );
}
