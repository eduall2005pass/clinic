import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ActivityLogIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Student Activity — MediSpark Admin",
  description: "Track student activity across the platform.",
};

export default function StudentActivityPage() {
  return <AdminPlaceholder title="Student Activity" description="Track student activity across the platform." icon={ActivityLogIcon} />;
}
