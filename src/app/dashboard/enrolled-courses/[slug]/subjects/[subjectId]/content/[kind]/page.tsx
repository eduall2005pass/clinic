import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PermissionGate from "@/components/auth/PermissionGate";
import { CourseKindChaptersView } from "@/components/dashboard/CourseContentCards";
import type { ContentKind } from "@/components/dashboard/CourseContentCards";

const KINDS: ContentKind[] = ["classes", "exams", "materials", "archive"];

export const metadata: Metadata = {
  title: "Subject Content | My Enrolled Courses",
  description: "Chapters for Class, Exam, Materials and Archive within a subject.",
};

export default async function SubjectKindChaptersPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string; kind: string }>;
}) {
  const { slug, subjectId, kind } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const decodedSubjectId = decodeURIComponent(subjectId);
  const decodedKind = decodeURIComponent(kind) as ContentKind;
  if (!KINDS.includes(decodedKind)) notFound();
  return (
    <main className="flex-1 bg-dark-950">
      <PermissionGate requirement="course" courseSlug={decodedSlug} loadingLabel="Loading course...">
        <CourseKindChaptersView slug={decodedSlug} kind={decodedKind} subjectId={decodedSubjectId} />
      </PermissionGate>
    </main>
  );
}
