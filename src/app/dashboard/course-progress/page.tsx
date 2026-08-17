import type { Metadata } from "next";
import EnrollmentRequiredSection from "@/components/auth/EnrollmentRequiredSection";

export const metadata: Metadata = {
  title: "Course Progress",
  description:
    "Track your learning progress on MediSpark — your course progress will appear here.",
};

export default function CourseProgressPage() {
  return (
    <EnrollmentRequiredSection
      title="Course Progress"
      description="Your course progress will be shown here. Progress data will be connected to your account in an upcoming step."
    />
  );
}