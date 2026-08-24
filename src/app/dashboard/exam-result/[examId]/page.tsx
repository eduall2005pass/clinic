import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import ExamResultDetailView from "@/components/dashboard/ExamResultDetailView";

export const metadata: Metadata = {
  title: "Detailed Exam Result",
  description: "Your detailed MediSpark exam result for one exam.",
};

export default async function ExamResultDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <AccessGate
        requirement="registered"
        title="Registration Required"
        message="You need to register to view your exam results."
        actionLabel="Register Now"
        actionHref="/register"
        loadingLabel="Loading result..."
        secondaryLabel="Back to Dashboard"
        secondaryHref="/dashboard"
      >
        <ExamResultDetailView examId={decodeURIComponent(examId)} />
      </AccessGate>
    </main>
  );
}
