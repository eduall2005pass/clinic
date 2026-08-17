"use client";

import { AccessGate } from "@/components/auth/AccessGuard";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";

export default function EnrollmentRequiredSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AccessGate
      requirement="enrolled"
      title="Course Enrollment Required"
      message="Please enroll in a course to access your learning dashboard."
      actionLabel="Explore Courses"
      actionHref="/courses"
      loadingLabel={`Loading ${title}...`}
      secondaryLabel="Back to Dashboard"
      secondaryHref="/dashboard"
    >
      <SectionPlaceholder title={title} description={description} />
    </AccessGate>
  );
}