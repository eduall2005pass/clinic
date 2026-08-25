import type { Metadata } from "next";
import PermissionGate from "@/components/auth/PermissionGate";
import DirectContentView from "@/components/dashboard/CourseContentCards";

export const metadata: Metadata = {
  title: "Subject Content | My Enrolled Courses",
  description: "Classes, exams and materials of a subject, organized by chapter.",
};

export default async function SubjectContentPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <PermissionGate
        requirement="course"
        courseSlug={decodeURIComponent(slug)}
        loadingLabel="Loading course..."
      >
        <DirectContentView
          slug={decodeURIComponent(slug)}
          subjectId={decodeURIComponent(subjectId)}
        />
      </PermissionGate>
    </main>
  );
}
