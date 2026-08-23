import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import EnrolledCoursesList from "@/components/dashboard/EnrolledCoursesList";
import DashboardSubUnits from "@/components/dashboard/DashboardSubUnits";
import { dashboardSubUnits } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "My Enrolled Courses",
  description:
    "Access your enrolled courses on MediSpark — active enrollments and pending requests.",
};

export default function EnrolledCoursesPage() {
  return (
    <AccessGate
      requirement="registered"
      title="Registration Required"
      message="You need to register to view your enrolled courses."
      actionLabel="Register Now"
      actionHref="/register"
      loadingLabel="Loading your enrolled courses..."
      secondaryLabel="Back to Dashboard"
      secondaryHref="/dashboard"
    >
      <EnrolledCoursesList />
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="text-lg font-bold text-heading">Inside each course</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Your enrolled courses open into this learning path — Subject →
          Paper / Segment → Chapter → Class → Exam → Materials. Sub-levels
          will become clickable as their data is connected.
        </p>
        <div className="mt-5">
          <DashboardSubUnits items={dashboardSubUnits["/dashboard/enrolled-courses"]} />
        </div>
      </section>
    </AccessGate>
  );
}