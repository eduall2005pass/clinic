import type { Metadata } from "next";
import ExamCategoryCards from "@/components/ExamCategoryCards";

export const dynamic = "force-dynamic";

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
export default function ExamPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <ExamCategoryCards />
    </main>
  );
}