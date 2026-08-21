import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { HeaderPanelIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Header / Navbar — MediSpark Admin",
  description: "Control the main website header and navbar items from here.",
};

export default function HeaderNavbarPage() {
  return <AdminPlaceholder title="Header / Navbar" description="Control the main website header and navbar items from here." icon={HeaderPanelIcon} />;
}
