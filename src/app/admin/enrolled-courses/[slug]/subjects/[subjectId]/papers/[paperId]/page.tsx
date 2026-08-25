import type { Metadata } from "next";
import { AdminPaperContentView } from "@/components/admin/AdminEnrolledCourses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paper / Segment — Admin Enrolled Courses",
  description: "Chapter-wise classes, exams and materials on MediSpark Admin.",
};

export default async function AdminEnrolledCoursePaperPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string; paperId: string }>;
}) {
  const { slug, subjectId, paperId } = await params;
  return (
    <AdminPaperContentView
      slug={decodeURIComponent(slug)}
      subjectId={decodeURIComponent(subjectId)}
      paperId={decodeURIComponent(paperId)}
    />
  );
}
