import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ActivityLogIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "System Logs — MediSpark Admin",
  description: "View system-level logs and diagnostics.",
};

export default function SystemLogsPage() {
  return <AdminPlaceholder title="System Logs" description="View system-level logs and diagnostics." icon={ActivityLogIcon} />;
}
