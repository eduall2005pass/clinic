import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import RecentlyViewedView from "@/components/dashboard/RecentlyViewedView";

export const metadata: Metadata = {
  title: "Recently Viewed",
  description:
    "Revisit your recent activity on MediSpark — courses, classes, exams and materials you opened lately.",
};

export default function RecentlyViewedPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <AccessGate
        requirement="enrolled"
        loadingLabel="Loading your recently viewed items..."
      >
        <RecentlyViewedView />
      </AccessGate>
    </main>
  );
}
