import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";

/**
 * Admin → Dashboard. Mirrors the Student Dashboard structure — manage the
 * content and settings behind each student-facing dashboard section.
 */
export default function AdminDashboardHub() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Dashboard"
        title="Student Dashboard Management"
        description="Manage the student-facing dashboard sections — notifications, exam results, enrollments and account data. The existing student Dashboard functionality remains intact."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementCard
          href="/admin/students/enrollments"
          title="Enrolled Courses"
          description="Approve pending enrollments and change enrollment status."
        />
        <ManagementCard
          href="/admin/students/all"
          title="Students"
          description="All registered students and their profiles."
        />
        <ManagementCard
          href="/admin/content/notifications"
          title="Notifications"
          description="In-app notifications sent to students."
        />
        <ManagementCard
          href="/admin/content/push"
          title="Push Notifications"
          description="Push messages to student devices."
        />
        <ManagementCard
          href="/admin/exams/results"
          title="Exam Results"
          description="Results shown on the student Exam Result page."
        />
        <ManagementCard
          href="/admin/courses/classes"
          title="Classes & Progress"
          description="The classes students resume from Continue Learning."
        />
      </div>
    </section>
  );
}
