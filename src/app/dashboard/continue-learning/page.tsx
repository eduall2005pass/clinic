import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Continue Learning",
  description:
    "Pick up where you left off on MediSpark — your in-progress learning will appear here.",
};

export default function ContinueLearningPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Continue Learning"
        description="Pick up where you left off."
      />
      <SectionPlaceholder
        title="Continue Learning"
        description="Your in-progress learning will be shown here. Continue Learning data will be connected to your account in an upcoming step."
      />
    </main>
  );
}