import type { Metadata } from "next";
import {
  AdminChapterView,
  type TabKey,
} from "@/components/admin/AdminEnrolledCourses";

export const metadata: Metadata = {
  title: "Chapter | Admin — My Enrolled Course",
};

const KINDS: TabKey[] = ["classes", "exams", "materials"];

export default async function AdminChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subjectId: string; paperId: string; chapterId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { slug, subjectId, paperId, chapterId } = await params;
  const { kind } = await searchParams;
  const safeKind: TabKey = (KINDS as string[]).includes(kind ?? "")
    ? (kind as TabKey)
    : "classes";

  return (
    <AdminChapterView
      slug={decodeURIComponent(slug)}
      subjectId={decodeURIComponent(subjectId)}
      paperId={decodeURIComponent(paperId)}
      chapterId={decodeURIComponent(chapterId)}
      kind={safeKind}
    />
  );
}
