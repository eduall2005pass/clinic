import type { Metadata } from "next";
import { PaperContentView } from "@/components/dashboard/CourseLevels";

export const metadata: Metadata = {
  title: "Paper / Segment | My Enrolled Courses",
  description: "Classes, exams and materials of a paper or segment, organized by chapter.",
};

export default async function PaperPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string; paperId: string }>;
}) {
  const { slug, subjectId, paperId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <PaperContentView
        slug={decodeURIComponent(slug)}
        subjectId={decodeURIComponent(subjectId)}
        paperId={decodeURIComponent(paperId)}
      />
    </main>
  );
}
