import type { Metadata } from "next";
import CourseLearningView from "@/components/dashboard/CourseLearningView";

export const metadata: Metadata = {
  title: "Course | My Enrolled Courses",
  description: "Your enrolled course content on MediSpark.",
};

export default async function EnrolledCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <CourseLearningView slug={decodeURIComponent(slug)} />
    </main>
  );
}
