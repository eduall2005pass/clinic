import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { TargetIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Campaigns — MediSpark Admin",
  description: "Plan and manage marketing campaigns.",
};

export default function CampaignsPage() {
  return <AdminPlaceholder title="Campaigns" description="Plan and manage marketing campaigns." icon={TargetIcon} />;
}
