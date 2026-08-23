import ExamManager from "@/components/admin/ExamManager";

export default function PublicExamsPage() {
  return (
    <ExamManager
      title="Public Exams"
      description="Create and manage published exams visible to students — model tests, practice and chapter exams."
      kindFilter={["public", "practice"]}
    />
  );
}
