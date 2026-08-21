import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ResultsChartIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Results — MediSpark Admin",
  description: "Publish and manage exam results.",
};

export default function ExamResultsPage() {
  return <AdminPlaceholder title="Results" description="Publish and manage exam results." icon={ResultsChartIcon} />;
}
