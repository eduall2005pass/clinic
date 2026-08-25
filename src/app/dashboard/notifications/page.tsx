import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import NotificationsList from "@/components/dashboard/NotificationsList";
import PushOptIn from "@/components/dashboard/PushOptIn";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Your MediSpark notifications — announcements and updates from the team.",
};

export default function NotificationsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-dark-950 px-4 py-10">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Notifications
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Exam, course and announcement updates will appear here.
        </p>
      </div>
      <PushOptIn />
      <div className="flex w-full justify-center">
        <AccessGate
          requirement="registered"
          loadingLabel="Loading notifications..."
        >
          <NotificationsList />
        </AccessGate>
      </div>
    </main>
  );
}
