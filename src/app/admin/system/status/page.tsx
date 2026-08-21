import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ZapIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "System Status — MediSpark Admin",
  description: "Monitor the health and status of the platform.",
};

export default function SystemStatusPage() {
  return <AdminPlaceholder title="System Status" description="Monitor the health and status of the platform." icon={ZapIcon} />;
}
