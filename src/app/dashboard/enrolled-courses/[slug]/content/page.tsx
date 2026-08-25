import type { Metadata } from "next";
import PermissionGate from "@/components/auth/PermissionGate";
import DirectContentView from "@/components/dashboard/CourseContentCards";

export const metadata: Metadata = {
  title: "Course Content | My Enrolled Courses",
  description: "Classes, exams and materials organized by chapter.",
};

export default async function CourseContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <PermissionGate
        requirement="course"
        courseSlug={decodeURIComponent(slug)}
        loadingLabel="Loading course..."
      >
        <DirectContentView slug={decodeURIComponent(slug)} />
      </PermissionGate>
    </main>
  );
}
