import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { FooterPanelIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Footer — MediSpark Admin",
  description: "Control the main website footer content and links.",
};

export default function WebsiteFooterPage() {
  return <AdminPlaceholder title="Footer" description="Control the main website footer content and links." icon={FooterPanelIcon} />;
}
