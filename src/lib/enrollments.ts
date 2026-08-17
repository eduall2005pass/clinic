import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
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

/**
 * Ensures the course catalog document exists for this course. The
 * Firestore rules only allow creating canonical catalog entries, so this
 * is safe to run from the client — existing entries can never be tampered
 * with.
 */
async function ensureCourseCatalog(course: Course): Promise<void> {
  if (!db) return;
  const catalogRef = doc(db, "courses", course.slug);
  const existing = await getDoc(catalogRef);
  if (existing.exists()) return;
  await setDoc(catalogRef, {
    courseId: course.slug,
    kind: getCourseKind(course),
  });
}

export async function fetchEnrollments(uid: string): Promise<Enrollment[]> {
  if (!db) return [];
  const snapshot = await getDocs(
    query(collection(db, "enrollments"), where("studentUid", "==", uid)),
  );
  return snapshot.docs.map((item) => item.data() as Enrollment);
}

export async function getEnrollment(
  uid: string,
  courseId: string,
): Promise<Enrollment | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "enrollments", `${uid}_${courseId}`));
  return snapshot.exists() ? (snapshot.data() as Enrollment) : null;
}

/**
 * Creates an enrollment record. Free courses become active immediately;
 * paid courses start as pending until payment/approval is completed.
 */
export async function enrollInCourse(
  course: Course,
  uid: string,
): Promise<Enrollment> {
  if (!db) {
    throw new Error("Firestore is not configured.");
  }
  await ensureCourseCatalog(course);
  const enrollment: Enrollment = {
    studentUid: uid,
    courseId: course.slug,
    courseName: course.name,
    courseType: course.category,
    courseKind: getCourseKind(course),
    fee: getPayableFee(course),
    enrollmentStatus: getCourseKind(course) === "free" ? "active" : "pending",
    enrollmentDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "enrollments", `${uid}_${course.slug}`), enrollment);
  return enrollment;
}