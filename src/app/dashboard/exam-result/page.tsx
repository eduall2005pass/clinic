import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Exam Result",
  description:
    "Track your exam performance on MediSpark — your exam results will appear here.",
};

export default function ExamResultPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="Exam Result"
        description="Your exam results will be shown here. Exam result data will be connected to your account in an upcoming step."
      />
    </main>
  );
}