import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { DatabaseIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Storage — MediSpark Admin",
  description: "Manage database and file storage usage.",
};

export default function StoragePage() {
  return <AdminPlaceholder title="Storage" description="Manage database and file storage usage." icon={DatabaseIcon} />;
}
