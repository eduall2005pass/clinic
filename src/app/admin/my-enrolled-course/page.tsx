import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";

/**
 * Admin → My Enrolled Course. Same hierarchy as the student-facing
 * My Enrolled Courses flow: Course → Subject → Paper / Segment →
 * Class · Exam · Materials → Chapter → Content.
 */
export default function AdminMyEnrolledCourseHub() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · My Enrolled Course"
        title="Enrolled Course Content"
        description="Manage exactly what students see inside their enrolled courses — the same hierarchy, one source of truth."
      />

      <p className="mt-6 rounded-xl border border-primary-600/30 bg-primary-600/10 px-4 py-3 text-xs font-semibold text-primary-200">
        Hierarchy: Course → Subject → Paper / Segment (১ম / ২য় পত্র) → Class ·
        Exam · Materials → Chapter → Content
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementCard
          href="/admin/students/enrollments"
          title="Student Enrollments"
          description="Who is enrolled where — approve, activate or deactivate."
        />
        <ManagementCard
          href="/admin/courses/papers"
          title="Papers (১ম / ২য় পত্র)"
          description="Create papers per subject and assign chapters to them."
        />
        <ManagementCard
          href="/admin/courses/subjects"
          title="Subjects"
          description="Subjects inside each course (e.g. Biology for crash courses)."
        />
        <ManagementCard
          href="/admin/courses/chapters"
          title="Chapters"
          description="Chapter names and order shown on chapter buttons."
        />
        <ManagementCard
          href="/admin/courses/classes"
          title="Classes / Lectures"
          description="Video lessons under each chapter, in sequence."
        />
        <ManagementCard
          href="/admin/exams/enrolled"
          title="Exams"
          description="Chapter-attached exams shown in the Exam card."
        />
        <ManagementCard
          href="/admin/courses/papers"
          title="Materials"
          description="PDFs and resources per chapter (Materials card)."
        />
      </div>
    </section>
  );
}
