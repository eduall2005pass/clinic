import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { MentorsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Mentors Section — MediSpark Admin",
  description: "Manage the mentors shown in the homepage mentors section.",
};

export default function HomepageMentorsPage() {
  return <AdminPlaceholder title="Mentors Section" description="Manage the mentors shown in the homepage mentors section." icon={MentorsIcon} />;
}
