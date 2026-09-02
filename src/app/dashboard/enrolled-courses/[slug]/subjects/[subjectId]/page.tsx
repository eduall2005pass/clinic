import type { Metadata } from "next";
import { Flow4SubjectView } from "@/components/dashboard/Flow4Student";

export const metadata: Metadata = {
  title: "Subject | My Enrolled Courses",
  description: "Chapters of your enrolled subject — Course → Subject → Chapter → Content.",
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <Flow4SubjectView
        slug={decodeURIComponent(slug)}
        subjectId={decodeURIComponent(subjectId)}
      />
    </main>
  );
}
