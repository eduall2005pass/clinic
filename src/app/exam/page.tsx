import type { Metadata } from "next";
import ExamCategoryCards from "@/components/ExamCategoryCards";
import { fetchLiveExamCounts } from "@/lib/public-exams-server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Public Exam",
  description:
    "MediSpark public exams — model tests and mock exams for HSC academic and medical admission students.",
};

/**
 * Dedicated Public Exam landing page — opens from the Navbar / Hamburger
 * Menu. Shows ONLY the 4 course-category cards; exam lists live inside each
 * category page (/exam/category/<key>).
 */
export default async function ExamPage() {
  const initialCounts = await fetchLiveExamCounts();
  return (
    <main className="flex-1 bg-dark-950">
      <ExamCategoryCards initialCounts={initialCounts} />
    </main>
  );
}