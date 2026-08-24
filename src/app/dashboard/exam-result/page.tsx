import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import ExamResultsView from "@/components/dashboard/ExamResultsView";

export const metadata: Metadata = {
  title: "Exam Results",
  description:
    "All your MediSpark exam results — course-wise totals, obtained marks, highest marks and merit ranking.",
};

export default function ExamResultPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <AccessGate
        requirement="registered"
        title="Registration Required"
        message="You need to register to view your exam results."
        actionLabel="Register Now"
        actionHref="/register"
        loadingLabel="Loading your exam results..."
        secondaryLabel="Back to Dashboard"
        secondaryHref="/dashboard"
      >
        <ExamResultsView />
      </AccessGate>
    </main>
  );
}
