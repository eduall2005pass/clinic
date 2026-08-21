import type { Metadata } from "next";
import FaqManager from "@/components/admin/FaqManager";

export const metadata: Metadata = {
  title: "FAQ Section — MediSpark Admin",
  description: "Manage FAQ entries shown on the homepage.",
};

export default function WebsiteFaqPage() {
  return (
    <FaqManager
      loadingLabel="Loading FAQ settings…"
      heading="FAQ Section"
      description="Manage the FAQs shown on the live website — add, edit, delete, enable or disable entries and change their display order. Changes go live immediately."
    />
  );
}
