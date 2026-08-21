import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { QuestionBankIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Question Bank — MediSpark Admin",
  description: "Build and organize the question bank for exams.",
};

export default function QuestionBankPage() {
  return <AdminPlaceholder title="Question Bank" description="Build and organize the question bank for exams." icon={QuestionBankIcon} />;
}
