import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { JerseyIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Jersey — MediSpark Admin",
  description: "Manage jersey products and related content.",
};

export default function ContentJerseyPage() {
  return <AdminPlaceholder title="Jersey" description="Manage jersey products and related content." icon={JerseyIcon} />;
}
