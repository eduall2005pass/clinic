import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Student Profile",
  description:
    "Manage your personal information on MediSpark — your profile details will appear here.",
};

export default function StudentProfilePage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="Student Profile"
        description="Your personal information will be shown here. Profile details will be connected to your account in an upcoming step."
      />
    </main>
  );
}