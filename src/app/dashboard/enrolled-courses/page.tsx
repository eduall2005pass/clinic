import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import EnrolledCoursesList from "@/components/dashboard/EnrolledCoursesList";

export const metadata: Metadata = {
  title: "My Enrolled Courses",
  description:
    "Access your enrolled courses on MediSpark — active enrollments and pending requests.",
};

export default function EnrolledCoursesPage() {
  return (
    <AccessGate
      requirement="enrolled"
      loadingLabel="Loading your enrolled courses..."
    >
      <EnrolledCoursesList />
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="text-lg font-bold text-heading">Inside each course</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Your enrolled courses open into this learning path — Course → Subject
          → Paper / Segment → Classes · Exams · Materials, organized by
          chapter.
        </p>
      </section>
    </AccessGate>
  );
}