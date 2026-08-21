import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { NotificationsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Notifications — MediSpark Admin",
  description: "Send and manage notifications for students.",
};

export default function ContentNotificationsPage() {
  return <AdminPlaceholder title="Notifications" description="Send and manage notifications for students." icon={NotificationsIcon} />;
}
