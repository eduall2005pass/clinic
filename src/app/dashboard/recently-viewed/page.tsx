import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Recently Viewed",
  description:
    "Revisit your recent activity on MediSpark — your recently viewed content will appear here.",
};

export default function RecentlyViewedPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="Recently Viewed"
        description="Your recently viewed content will be shown here. Recent activity data will be connected to your account in an upcoming step."
      />
    </main>
  );
}