import type { User } from "firebase/auth";
import type { Course } from "./courses";
import { getPayableFee } from "./courses";

export type CourseKind = "free" | "paid";

export type EnrollmentStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "completed";

export type Enrollment = {
  studentUid: string;
  courseId: string;
  courseName: string;
  courseType: "Academic" | "Admission";
  courseKind: CourseKind;
  fee: number;
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate?: unknown;
  updatedAt?: unknown;
};

export function getCourseKind(course: Course): CourseKind {
  return course.fee > 0 ? "paid" : "free";
}

export function isActiveEnrollment(enrollment: Enrollment): boolean {
  return enrollment.enrollmentStatus === "active";
}

async function authHeaders(user: User): Promise<Record<string, string>> {
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchEnrollments(user: User): Promise<Enrollment[]> {
  try {
    const response = await fetch("/api/enrollments", {
      headers: await authHeaders(user),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { enrollments?: unknown };
    return Array.isArray(data.enrollments) ? (data.enrollments as Enrollment[]) : [];
  } catch {
    return [];
  }
}

export async function getEnrollment(
  user: User,
  courseId: string,
): Promise<Enrollment | null> {
  const enrollments = await fetchEnrollments(user);
  return (
    enrollments.find((enrollment) => enrollment.courseId === courseId) ?? null
  );
}

/**
 * Creates an enrollment record via the API. Free courses become active
 * immediately; paid courses start as pending until payment/approval is
 * completed.
 */
export async function enrollInCourse(
  course: Course,
  user: User,
  couponCode?: string | null,
): Promise<Enrollment> {
  const response = await fetch("/api/enrollments", {
    method: "POST",
    headers: await authHeaders(user),
    body: JSON.stringify({
      courseId: course.slug,
      courseName: course.name,
      courseType: course.category,
      courseKind: getCourseKind(course),
      fee: getPayableFee(course),
      ...(couponCode ? { couponCode } : {}),
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    enrollment?: Enrollment;
    error?: string;
  } | null;
  if (!response.ok || !data?.enrollment) {
    throw new Error(data?.error ?? "Could not complete the enrollment.");
  }
  return data.enrollment;
}