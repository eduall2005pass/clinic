import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { SettingsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Exam Settings — MediSpark Admin",
  description: "Configure default settings for exams across the platform.",
};

export default function ExamSettingsPage() {
  return <AdminPlaceholder title="Exam Settings" description="Configure default settings for exams across the platform." icon={SettingsIcon} />;
}
