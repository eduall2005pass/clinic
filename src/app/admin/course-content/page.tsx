import Link from "next/link";
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
        eyebrow="Admin · Course Content"
        title="Course Content Management"
        description="Manage exactly what students see inside their enrolled courses — the same hierarchy, one source of truth."
      />

      <p className="mt-6 rounded-xl border border-primary-600/30 bg-primary-600/10 px-4 py-3 text-xs font-semibold text-primary-200">
        Hierarchy: Course → Subject → Paper / Segment (১ম / ২য় পত্র) → Class ·
        Exam · Materials → Chapter → Content
      </p>

      {/* Start of the actual management flow — course cards first */}
      <Link
        href="/admin/enrolled-courses"
        className="group mt-8 flex items-center gap-4 rounded-2xl border border-primary-600/40 bg-gradient-to-r from-primary-600/10 via-dark-900 to-dark-900 p-6 shadow-xl shadow-black/30 ring-1 ring-primary-600/20 transition duration-300 hover:-translate-y-1 hover:border-primary-500/70 hover:shadow-primary-900/40 active:scale-[0.99]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600/20 text-primary-400 shadow-md shadow-primary-900/30 transition group-hover:bg-primary-600 group-hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold text-heading group-hover:text-primary-300 sm:text-lg">
            Open My Enrolled Courses Flow
          </span>
          <span className="mt-1 block text-xs text-neutral-300 sm:text-sm">
            Browse enrolled courses exactly like students do — Course → Subject → Paper → Chapter → Content.
          </span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 shrink-0 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-[#1a3a78]">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </Link>

      <h2 className="mt-10 text-base font-extrabold text-heading">Management Tools</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
