import type { Metadata } from "next";
import { SubjectPapersView } from "@/components/dashboard/CourseLevels";

export const metadata: Metadata = {
  title: "Subject | My Enrolled Courses",
  description: "Papers, segments and chapters of your enrolled subject.",
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <SubjectPapersView
        slug={decodeURIComponent(slug)}
        subjectId={decodeURIComponent(subjectId)}
      />
    </main>
  );
}
