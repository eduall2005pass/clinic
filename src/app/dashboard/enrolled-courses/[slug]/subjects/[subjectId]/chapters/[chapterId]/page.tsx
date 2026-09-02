import type { Metadata } from "next";
import { Flow4ChapterView } from "@/components/dashboard/Flow4Student";

export const metadata: Metadata = {
  title: "Chapter Content | My Enrolled Courses",
  description: "All available learning content inside this chapter — Course → Subject → Chapter → Content.",
};

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string; chapterId: string }>;
}) {
  const { slug, subjectId, chapterId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <Flow4ChapterView
        slug={decodeURIComponent(slug)}
        subjectId={decodeURIComponent(subjectId)}
        chapterId={decodeURIComponent(chapterId)}
      />
    </main>
  );
}
