import type { Metadata } from "next";
import EnrollmentRequiredSection from "@/components/auth/EnrollmentRequiredSection";
import { dashboardSubUnits } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Continue Learning",
  description:
    "Pick up where you left off on MediSpark — your in-progress learning will appear here.",
};

export default function ContinueLearningPage() {
  return (
    <EnrollmentRequiredSection
      subUnits={dashboardSubUnits["/dashboard/continue-learning"]}
      title="Continue Learning"
      description="Your in-progress learning will be shown here. Continue Learning data will be connected to your account in an upcoming step."
    />
  );
}