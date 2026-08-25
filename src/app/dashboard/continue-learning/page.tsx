import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import ContinueLearningList from "@/components/dashboard/ContinueLearningList";

export const metadata: Metadata = {
  title: "Continue Learning",
  description:
    "Pick up where you left off on MediSpark — your in-progress learning will appear here.",
};

export default function ContinueLearningPage() {
  return (
    <AccessGate requirement="enrolled" loadingLabel="Loading Continue Learning...">
      <ContinueLearningList />
    </AccessGate>
  );
}
