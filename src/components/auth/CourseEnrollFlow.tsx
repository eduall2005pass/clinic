"use client";

import { useSearchParams } from "next/navigation";
import EnrollButton from "@/components/auth/EnrollButton";
import type { Course } from "@/lib/courses";

export default function CourseEnrollFlow({ course }: { course: Course }) {
  const searchParams = useSearchParams();
  const autoOpen = searchParams.get("enroll") === "1";

  return <EnrollButton course={course} variant="details" defaultOpen={autoOpen} />;
}