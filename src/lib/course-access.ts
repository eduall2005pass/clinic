"use client";

import { useMemo } from "react";
import { useAuth } from "./auth-context";
import type { Course } from "./courses";
import type { Enrollment } from "./enrollments";

export type CourseAccess = {
  enrollment: Enrollment | null;
  isActive: boolean;
  isPending: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
  isPaid: boolean;
  canAccessContent: boolean;
  canAccessQa: boolean;
};

export function useCourseAccess(course: Course): CourseAccess {
  const { user, enrollments } = useAuth();

  const enrollment = useMemo(
    () => enrollments.find((item) => item.courseId === course.slug) ?? null,
    [enrollments, course.slug],
  );

  const isActive = enrollment?.enrollmentStatus === "active";
  const isPaid = enrollment?.courseKind === "paid";

  return {
    enrollment,
    isActive,
    isPending: enrollment?.enrollmentStatus === "pending",
    isCancelled: enrollment?.enrollmentStatus === "cancelled",
    isCompleted: enrollment?.enrollmentStatus === "completed",
    isPaid,
    canAccessContent: !!user && isActive,
    canAccessQa: !!user && isActive && isPaid,
  };
}