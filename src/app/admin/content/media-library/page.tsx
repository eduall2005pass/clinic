import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { MediaIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Media Library — MediSpark Admin",
  description: "Manage all images, files and media used across the website.",
};

export default function MediaLibraryPage() {
  return <AdminPlaceholder title="Media Library" description="Manage all images, files and media used across the website." icon={MediaIcon} />;
}
