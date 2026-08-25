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
        loadingLabel="Loading result..."
      >
        <ExamResultDetailView examId={decodeURIComponent(examId)} />
      </AccessGate>
    </main>
  );
}
