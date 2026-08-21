import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { ZapIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Cache — MediSpark Admin",
  description: "Clear and manage website caches.",
};

export default function CachePage() {
  return <AdminPlaceholder title="Cache" description="Clear and manage website caches." icon={ZapIcon} />;
}
