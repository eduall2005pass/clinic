import type { Metadata } from "next";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Your global MediSpark notifications — updates from all dashboard sections appear here.",
};

export default function NotificationsPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <SectionPlaceholder
        title="No notifications yet"
        description="Notifications from all dashboard sections will appear here in one place. Notification generation will be added in an upcoming step."
      />
    </main>
  );
}