import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ExamsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Public Exams — MediSpark Admin",
  description: "Create and manage exams open to everyone.",
};

export default function PublicExamsPage() {
  return <AdminPlaceholder title="Public Exams" description="Create and manage exams open to everyone." icon={ExamsIcon} />;
}
