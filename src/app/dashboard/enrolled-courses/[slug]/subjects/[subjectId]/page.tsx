import type { Metadata } from "next";
import SubjectRouter from "@/components/dashboard/SubjectRouter";

export const metadata: Metadata = {
  title: "Subject | My Enrolled Courses",
  description: "Contents of your enrolled subject — Course Content → Subject → Content.",
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <SubjectRouter slug={decodeURIComponent(slug)} subjectId={decodeURIComponent(subjectId)} />
    </main>
  );
}
