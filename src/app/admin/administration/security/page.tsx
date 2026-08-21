import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { LockIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Security — MediSpark Admin",
  description: "Manage platform security settings and access control.",
};

export default function SecurityPage() {
  return <AdminPlaceholder title="Security" description="Manage platform security settings and access control." icon={LockIcon} />;
}
