import type { Metadata } from "next";
import FaqManager from "@/components/admin/FaqManager";

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
