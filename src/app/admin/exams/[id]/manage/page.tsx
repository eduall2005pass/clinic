import type { Metadata } from "next";
import ExamManageClient from "@/components/admin/ExamManageClient";

export const metadata: Metadata = {
  title: "Exam Management — MediSpark Admin",
  description: "Single-page exam management: Information, Questions, Rules, Participants and Results.",
};

export default async function ExamManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const examId = decodeURIComponent(id);
  return <ExamManageClient examId={examId} />;
}
