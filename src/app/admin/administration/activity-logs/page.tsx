import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ActivityLogIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Activity Logs — MediSpark Admin",
  description: "Track actions taken inside the admin panel.",
};

export default function ActivityLogsPage() {
  return <AdminPlaceholder title="Activity Logs" description="Track actions taken inside the admin panel." icon={ActivityLogIcon} />;
}
