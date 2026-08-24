import type { Metadata } from "next";
import { AccessGate } from "@/components/auth/AccessGuard";
import CourseProgressView from "@/components/dashboard/CourseProgressView";

export const metadata: Metadata = {
  title: "Course Progress",
  description:
    "Track your learning progress on MediSpark — overall, subject-wise and chapter-wise progress for your enrolled courses.",
};

export default function CourseProgressPage() {
  return (
    <main className="flex-1 bg-dark-950">
      <AccessGate
        requirement="enrolled"
        title="Course Enrollment Required"
        message="Please enroll in a course to track your learning progress."
        actionLabel="Explore Courses"
        actionHref="/courses"
        loadingLabel="Loading your course progress..."
        secondaryLabel="Back to Dashboard"
        secondaryHref="/dashboard"
      >
        <CourseProgressView />
      </AccessGate>
    </main>
  );
}
