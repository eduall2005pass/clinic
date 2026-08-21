import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { MentorsIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "All Mentors — MediSpark Admin",
  description: "View and manage all mentors on the platform.",
};

export default function AllMentorsPage() {
  return <AdminPlaceholder title="All Mentors" description="View and manage all mentors on the platform." icon={MentorsIcon} />;
}
