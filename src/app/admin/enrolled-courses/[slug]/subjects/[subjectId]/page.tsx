import type { Metadata } from "next";
import { AdminSubjectPapersView } from "@/components/admin/AdminEnrolledCourses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subject — Admin Enrolled Courses",
  description: "Papers and segments of a subject on MediSpark Admin.",
};

export default async function AdminEnrolledCourseSubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = await params;
  return (
    <AdminSubjectPapersView
      slug={decodeURIComponent(slug)}
      subjectId={decodeURIComponent(subjectId)}
    />
  );
}
