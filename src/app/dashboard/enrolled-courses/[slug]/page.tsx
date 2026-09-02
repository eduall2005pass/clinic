import type { Metadata } from "next";
import { Flow4CourseView } from "@/components/dashboard/Flow4Student";

export const metadata: Metadata = {
  title: "Course Content | My Enrolled Courses",
  description: "Your enrolled course content — Course → Subject → Chapter → Content.",
};

export default async function EnrolledCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <Flow4CourseView slug={decodeURIComponent(slug)} />
    </main>
  );
}
