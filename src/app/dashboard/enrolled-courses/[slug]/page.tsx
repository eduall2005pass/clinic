import type { Metadata } from "next";
import EnrolledCourseRouter from "@/components/dashboard/EnrolledCourseRouter";

export const metadata: Metadata = {
  title: "Course Content | My Enrolled Courses",
  description: "Your enrolled course content — Course → Subject → Content and legacy flows.",
};

export default async function EnrolledCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <EnrolledCourseRouter slug={decodeURIComponent(slug)} />
    </main>
  );
}
