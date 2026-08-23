import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import NotificationsList from "@/components/dashboard/NotificationsList";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Your MediSpark notifications — announcements and updates from the team.",
};

export default function NotificationsPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <AccessGate
        requirement="registered"
        title="Registration Required"
        message="You need to register to view your notifications."
        actionLabel="Register Now"
        actionHref="/register"
        loadingLabel="Loading notifications..."
        secondaryLabel="Back to Dashboard"
        secondaryHref="/dashboard"
      >
        <NotificationsList />
      </AccessGate>
    </main>
  );
}
