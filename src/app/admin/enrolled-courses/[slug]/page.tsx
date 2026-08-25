import type { Metadata } from "next";
import { AdminCourseSubjectsView } from "@/components/admin/AdminEnrolledCourses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Course — Admin Enrolled Courses",
  description: "Subjects inside this course on MediSpark Admin.",
};

export default async function AdminEnrolledCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AdminCourseSubjectsView slug={decodeURIComponent(slug)} />;
}
