import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { MegaphoneIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Popup / Announcement — MediSpark Admin",
  description: "Manage popups and announcement banners shown to visitors.",
};

export default function PopupAnnouncementPage() {
  return <AdminPlaceholder title="Popup / Announcement" description="Manage popups and announcement banners shown to visitors." icon={MegaphoneIcon} />;
}
