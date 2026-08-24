import type { Metadata } from "next";
import ExamCategoryCards from "@/components/ExamCategoryCards";
import MyEnrolledExams from "@/components/MyEnrolledExams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Exam",
  description:
    "MediSpark public exams — model tests and mock exams for HSC academic and medical admission students.",
};

export default async function ExamPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <MyEnrolledExams />
      <ExamCategoryCards />
    </main>
  );
}
