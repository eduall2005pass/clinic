import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "My Enrolled Course",
  description:
    "Access your enrolled courses on MediSpark — your enrolled courses will appear here.",
};

export default function EnrolledCoursesPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="My Enrolled Course"
        description="Your enrolled courses will be shown here. Enrolled course data will be connected to your account in an upcoming step."
      />
    </main>
  );
}