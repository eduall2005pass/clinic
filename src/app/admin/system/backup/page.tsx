import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { CloudUploadIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Backup — MediSpark Admin",
  description: "Create and manage database backups.",
};

export default function BackupPage() {
  return <AdminPlaceholder title="Backup" description="Create and manage database backups." icon={CloudUploadIcon} />;
}
