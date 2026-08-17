import type { Metadata } from "next";
import EnrollmentRequiredSection from "@/components/auth/EnrollmentRequiredSection";

export const metadata: Metadata = {
  title: "Continue Learning",
  description:
    "Pick up where you left off on MediSpark — your in-progress learning will appear here.",
};

export default function ContinueLearningPage() {
  return (
    <EnrollmentRequiredSection
      title="Continue Learning"
      description="Your in-progress learning will be shown here. Continue Learning data will be connected to your account in an upcoming step."
    />
  );
}