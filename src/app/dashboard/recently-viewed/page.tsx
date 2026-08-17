import type { Metadata } from "next";
import EnrollmentRequiredSection from "@/components/auth/EnrollmentRequiredSection";

export const metadata: Metadata = {
  title: "Recently Viewed",
  description:
    "Revisit your recent activity on MediSpark — your recently viewed content will appear here.",
};

export default function RecentlyViewedPage() {
  return (
    <EnrollmentRequiredSection
      title="Recently Viewed"
      description="Your recently viewed content will be shown here. Recent activity data will be connected to your account in an upcoming step."
    />
  );
}