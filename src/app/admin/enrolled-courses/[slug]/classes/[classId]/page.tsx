import type { Metadata } from "next";
import { AdminClassView } from "@/components/admin/AdminEnrolledCourses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Class — Admin Enrolled Courses",
  description: "Watch a class from any course on MediSpark Admin.",
};

export default async function AdminEnrolledCourseClassPage({
  params,
}: {
  params: Promise<{ slug: string; classId: string }>;
}) {
  const { slug, classId } = await params;
  return (
    <AdminClassView
      slug={decodeURIComponent(slug)}
      classId={decodeURIComponent(classId)}
    />
  );
}
