"use client";

import { AccessGate } from "@/components/auth/AccessGuard";
import SectionPlaceholder from "@/components/dashboard/SectionPlaceholder";
import DashboardSubUnits from "@/components/dashboard/DashboardSubUnits";
import type { DashboardSubItem } from "@/lib/dashboard";

export default function EnrollmentRequiredSection({
  title,
  description,
  subUnits,
}: {
  title: string;
  description: string;
  subUnits?: DashboardSubItem[];
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
      {subUnits && subUnits.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-lg font-bold text-heading">Sub-sections</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Your data will appear under these sub-sections once connected.
          </p>
          <div className="mt-5">
            <DashboardSubUnits items={subUnits} />
          </div>
        </section>
      ) : null}
      <SectionPlaceholder title={title} description={description} />
    </AccessGate>
  );
}