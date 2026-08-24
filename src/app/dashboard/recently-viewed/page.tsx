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
        title="Course Enrollment Required"
        message="Please enroll in a course to access your learning dashboard."
        actionLabel="Explore Courses"
        actionHref="/courses"
        loadingLabel="Loading your recently viewed items..."
        secondaryLabel="Back to Dashboard"
        secondaryHref="/dashboard"
      >
        <RecentlyViewedView />
      </AccessGate>
    </main>
  );
}
