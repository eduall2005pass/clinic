import PublicExamResultDetailView from "@/components/admin/PublicExamResultDetailView";

export const dynamic = "force-dynamic";

/**
 * Admin → Result Control → Public Exam Result → <examId>.
 * The exam_id scopes every query: participants, results and answer sheets
 * all come from this exact exam only.
 */
export default async function PublicExamResultDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return <PublicExamResultDetailView examId={decodeURIComponent(examId)} />;
}
