import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Course Progress",
  description:
    "Track your learning progress on MediSpark — your course progress will appear here.",
};

export default function CourseProgressPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="Course Progress"
        description="Your course progress will be shown here. Progress data will be connected to your account in an upcoming step."
      />
    </main>
  );
}