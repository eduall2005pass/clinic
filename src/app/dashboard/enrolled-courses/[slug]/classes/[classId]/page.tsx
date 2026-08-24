import type { Metadata } from "next";
import ClassPlayerView from "@/components/dashboard/ClassPlayerView";

export const metadata: Metadata = {
  title: "Class | My Enrolled Courses",
  description: "Watch a class from your enrolled course on MediSpark.",
};

export default async function ClassPage({
  params,
}: {
  params: Promise<{ slug: string; classId: string }>;
}) {
  const { slug, classId } = await params;
  return (
    <main className="flex-1 bg-dark-950">
      <ClassPlayerView
        slug={decodeURIComponent(slug)}
        classId={decodeURIComponent(classId)}
      />
    </main>
  );
}
