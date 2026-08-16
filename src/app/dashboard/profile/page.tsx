import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Student Profile",
  description:
    "Manage your personal information on MediSpark — your profile details will appear here.",
};

export default function StudentProfilePage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Student Profile"
        description="Manage your personal information."
      />
      <SectionPlaceholder
        title="Student Profile"
        description="Your personal information will be shown here. Profile details will be connected to your account in an upcoming step."
      />
    </main>
  );
}