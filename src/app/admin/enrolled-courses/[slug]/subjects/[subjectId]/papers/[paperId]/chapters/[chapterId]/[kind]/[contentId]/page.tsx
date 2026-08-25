import type { Metadata } from "next";
import { AdminContentView } from "@/components/admin/AdminEnrolledCourses";

export const metadata: Metadata = {
  title: "Content Details | Admin — My Enrolled Course",
};

type Kind = "exams" | "materials";

export default async function AdminContentDetailPage({
  params,
}: {
  params: Promise<{
    slug: string;
    subjectId: string;
    paperId: string;
    chapterId: string;
    kind: string;
    contentId: string;
  }>;
}) {
  const { slug, subjectId, paperId, chapterId, kind, contentId } = await params;
  const safeKind: Kind = kind === "materials" ? "materials" : "exams";

  return (
    <AdminContentView
      slug={decodeURIComponent(slug)}
      subjectId={decodeURIComponent(subjectId)}
      paperId={decodeURIComponent(paperId)}
      chapterId={decodeURIComponent(chapterId)}
      kind={safeKind}
      contentId={decodeURIComponent(contentId)}
    />
  );
}
