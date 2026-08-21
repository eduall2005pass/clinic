import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { MegaphoneIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Announcements — MediSpark Admin",
  description: "Publish announcements across the website.",
};

export default function ContentAnnouncementsPage() {
  return <AdminPlaceholder title="Announcements" description="Publish announcements across the website." icon={MegaphoneIcon} />;
}
