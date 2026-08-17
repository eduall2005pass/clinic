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
    </AccessGate>
  );
}