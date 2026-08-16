import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "My Enrolled Course",
  description:
    "Access your enrolled courses on MediSpark — your enrolled courses will appear here.",
};

export default function EnrolledCoursesPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="My Enrolled Course"
        description="Access your enrolled courses."
      />
      <SectionPlaceholder
        title="My Enrolled Course"
        description="Your enrolled courses will be shown here. Enrolled course data will be connected to your account in an upcoming step."
      />
    </main>
  );
}