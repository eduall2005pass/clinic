"use client";

import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

export default function ExamParticipationArea({
  examId,
}: {
  examId: string;
}) {
  const examHref = `/exam/${examId}`;
  const loginHref = `/login?next=${encodeURIComponent(examHref)}`;
  const { user, access, authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) {
    return <AccessLoading label="Checking enrollment..." />;
  }

  if (!user) {
    return (
      <AccessMessage
        title="Login Required to Start Exams"
        message="You can view this Public Exam without an account, but you must be logged in to start or submit an exam."
        actionLabel="Login to Start Exam"
        actionHref={loginHref}
        secondaryLabel="Back to Public Exams"
        secondaryHref="/exam"
      />
    );
  }

  if (!access.registered || !access.hasEnrollment) {
    return (
      <AccessMessage
        title="Course Enrollment Required"
        message="You need an active course enrollment to participate in course exams."
        actionLabel="Explore Courses"
        actionHref="/courses"
        secondaryLabel="Back to Public Exams"
        secondaryHref="/exam"
      />
    );
  }

  return (
    <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center">
      <p className="font-semibold text-primary-300">
        Exam engine coming soon.
      </p>
      <p className="mt-1 text-sm text-primary-200/70">
        Questions, timer, marking and results will be added in an upcoming
        step. You are enrolled and can start this exam once the engine
        is live.
      </p>
    </div>
  );
}