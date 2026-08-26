import type { Metadata } from "next";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AdminCourseCard } from "@/components/admin/AdminEnrolledCourses";
import { getAdminCourseSummaries } from "@/lib/my-learning";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enrolled Courses — MediSpark Admin",
  description:
    "Browse every course with the same content structure students see — Course → Subject → Paper/Segment → Chapter → Classes · Exams · Materials.",
};

export default async function AdminEnrolledCoursesPage() {
  const courses = await getAdminCourseSummaries().catch(() => []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="My Enrolled Courses"
        description="Same hierarchy and flow as the Student Dashboard — Course → Subject → Paper / Segment → Class · Exam · Materials, organized by chapter. Manage content at every level."
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <ManageLink href="/admin/courses/all" label="Manage Courses" />
        <ManageLink href="/admin/courses/subjects" label="Subjects" />
        <ManageLink href="/admin/courses/chapters" label="Chapters" />
        <ManageLink href="/admin/courses/papers" label="Papers & Materials" />
        <ManageLink href="/admin/courses/classes" label="Classes" />
      </div>

      {courses.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <p className="font-semibold text-[#0b1e3a] admin-dark:text-white">No courses yet</p>
          <p className="mt-1 text-sm text-slate-500 admin-dark:text-slate-400">
            Create a course first — it will appear here with its full content tree.
          </p>
          <Link
            href="/admin/courses/all"
            className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700"
          >
            Create Course
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <AdminCourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function ManageLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 px-4 py-2 text-xs font-bold text-zinc-600 shadow-sm transition hover:border-primary-500/50 hover:text-[#1a3a78] admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-zinc-300 admin-dark:hover:text-[#1a3a78]"
    >
      {label}
    </Link>
  );
}
