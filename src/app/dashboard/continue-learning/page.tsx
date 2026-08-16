import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Continue Learning",
  description:
    "Pick up where you left off on MediSpark — your in-progress learning will appear here.",
};

export default function ContinueLearningPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="Continue Learning"
        description="Your in-progress learning will be shown here. Continue Learning data will be connected to your account in an upcoming step."
      />
    </main>
  );
}