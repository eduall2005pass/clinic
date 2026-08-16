import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Recently Viewed",
  description:
    "Revisit your recent activity on MediSpark — your recently viewed content will appear here.",
};

export default function RecentlyViewedPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Recently Viewed"
        description="Revisit your recent activity."
      />
      <SectionPlaceholder
        title="Recently Viewed"
        description="Your recently viewed content will be shown here. Recent activity data will be connected to your account in an upcoming step."
      />
    </main>
  );
}