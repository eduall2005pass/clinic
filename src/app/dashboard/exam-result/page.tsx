import type { Metadata } from "next";
import EnrollmentRequiredSection from "@/components/auth/EnrollmentRequiredSection";

export const metadata: Metadata = {
  title: "Exam Result",
  description:
    "Track your exam performance on MediSpark — your exam results will appear here.",
};

export default function ExamResultPage() {
  return (
    <EnrollmentRequiredSection
      title="Exam Result"
      description="Your exam results will be shown here. Exam result data will be connected to your account in an upcoming step."
    />
  );
}