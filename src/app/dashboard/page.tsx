import type { Metadata } from "next";
import ProfileCard from "@/components/dashboard/ProfileCard";
import DashboardSectionCard from "@/components/dashboard/DashboardSectionCard";
import { dashboardSections } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "MediSpark dashboard — track your preparation and manage your personal information.",
};

const placeholderStudent = {
  name: "Student Name",
  studentId: "SP-00000",
};

export default function DashboardPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ProfileCard {...placeholderStudent} />

        <div className="mt-8 flex flex-col gap-4">
          {dashboardSections.map((section) => (
            <DashboardSectionCard key={section.href} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}