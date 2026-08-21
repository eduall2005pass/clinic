import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { KeyIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Answer Keys — MediSpark Admin",
  description: "Upload and manage answer keys for exams.",
};

export default function AnswerKeysPage() {
  return <AdminPlaceholder title="Answer Keys" description="Upload and manage answer keys for exams." icon={KeyIcon} />;
}
