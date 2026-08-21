import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { UserShieldIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Mentor Profiles — MediSpark Admin",
  description: "Manage mentor profiles shown on the website.",
};

export default function MentorProfilesPage() {
  return <AdminPlaceholder title="Mentor Profiles" description="Manage mentor profiles shown on the website." icon={UserShieldIcon} />;
}
