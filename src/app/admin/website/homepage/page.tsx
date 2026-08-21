import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { WindowIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Homepage — MediSpark Admin",
  description: "Control the overall homepage layout and visible sections of the website.",
};

export default function WebsiteHomepagePage() {
  return <AdminPlaceholder title="Homepage" description="Control the overall homepage layout and visible sections of the website." icon={WindowIcon} />;
}
