import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PermissionGate from "@/components/auth/PermissionGate";
import ChapterDirectContentView from "@/components/dashboard/ChapterDirectContent";
import type { ContentKind } from "@/components/dashboard/CourseContentCards";

export const metadata: Metadata = {
  title: "Chapter Content | My Enrolled Courses",
  description: "Classes, exams and materials of a chapter, in order.",
};

const KINDS: ContentKind[] = ["classes", "exams", "materials"];

export default async function ChapterContentPage({
  params,
}: {
  params: Promise<{ slug: string; chapterId: string; kind: string }>;
}) {
  const { slug, chapterId, kind } = await params;
  if (!KINDS.includes(kind as ContentKind)) notFound();
  return (
    <main className="flex-1 bg-dark-950">
      <PermissionGate
        requirement="course"
        courseSlug={decodeURIComponent(slug)}
        loadingLabel="Loading course..."
      >
        <ChapterDirectContentView
          slug={decodeURIComponent(slug)}
          chapterId={decodeURIComponent(chapterId)}
          kind={kind as ContentKind}
        />
      </PermissionGate>
    </main>
  );
}
