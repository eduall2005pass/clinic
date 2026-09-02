import type { Metadata } from "next";
import dynamic from "next/dynamic";
import AdminSkeleton from "@/components/admin/AdminSkeleton";

const FaqManager = dynamic(() => import("@/components/admin/FaqManager"), {
  loading: () => <AdminSkeleton />,
});

export const metadata: Metadata = {
  title: "FAQ — MediSpark Admin",
  description: "Manage FAQ entries shown on the website.",
};

export default function ContentFaqPage() {
  return (
    <FaqManager
      loadingLabel="Loading FAQs…"
      heading="FAQ"
      description="Manage FAQ entries shown on the website — add, edit, delete, enable or disable entries and change their display order. Changes go live immediately."
    />
  );
}
