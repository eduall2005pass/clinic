import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";

/**
 * Admin → Public Exam. Mirrors the Main Website Public Exam flow
 * (categories → live/upcoming/previous exams) with full management links.
 */
export default function AdminPublicExamHub() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Public Exam"
        title="Public Exam Management"
        description="Manage the exams shown on the Public Exam page — questions, answer keys, results and exam settings."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementCard
          href="/admin/exams/public"
          title="Public Exams"
          description="Create and manage the exams listed on /exam."
        />
        <ManagementCard
          href="/admin/exams/enrolled"
          title="Course Exams"
          description="Exams attached to enrolled course chapters."
        />
        <ManagementCard
          href="/admin/exams/question-bank"
          title="Question Bank"
          description="Reusable question pool for building exams."
        />
        <ManagementCard
          href="/admin/exams/answer-keys"
          title="Answer Keys"
          description="Per-exam answer keys used for grading."
        />
        <ManagementCard
          href="/admin/exams/results"
          title="Results"
          description="Student results, merit positions and highest marks."
        />
        <ManagementCard
          href="/admin/exams/settings"
          title="Exam Settings"
          description="Duration, negative marking and review defaults."
        />
      </div>
    </section>
  );
}
