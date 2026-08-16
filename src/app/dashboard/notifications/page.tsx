import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Your global MediSpark notifications — updates from all dashboard sections appear here.",
};

export default function NotificationsPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Notifications"
        description="Updates from all of your MediSpark activity — courses, exams, Q&A and more."
      />
      <SectionPlaceholder
        title="No notifications yet"
        description="Notifications from all dashboard sections will appear here in one place. Notification generation will be added in an upcoming step."
      />
    </main>
  );
}