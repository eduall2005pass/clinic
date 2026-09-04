"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isDirectContent } from "@/lib/course-content";
import { CourseSubjectsView } from "@/components/dashboard/CourseLevels";
import DirectContentView from "@/components/dashboard/CourseContentCards";
import { Flow4DirectCourseView } from "@/components/dashboard/Flow4Student";
import { AccessLoading } from "@/components/auth/AccessGuard";

type CourseMeta = { contentLayout?: string; name?: string; slug?: string };

export default function EnrolledCourseRouter({ slug }: { slug: string }) {
  const { user, authLoading } = useAuth();
  const [layout, setLayout] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      // Try my-learning endpoint first (has contentLayout), fallback to flow4 direct detection
      const res = await fetch(`/api/my/courses/${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { course?: CourseMeta };
        if (data.course?.contentLayout) {
          setLayout(data.course.contentLayout);
          setCourseName(data.course.name ?? null);
          setState("ready");
          return;
        }
      }
      // Fallback: if not enrolled or course missing, try to infer via catalog? default flow-1
      setLayout("flow-1");
      setState("ready");
    } catch {
      setLayout("flow-1");
      setState("ready");
    }
  }, [user, slug]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  if (authLoading || state === "loading" || layout === null) {
    return <AccessLoading label="Loading course…" />;
  }

  // Flow-4: NEW spec Course Content → Subject → Content
  if (layout === "flow-4") {
    return <Flow4DirectCourseView slug={slug} />;
  }

  // Flow-1 direct check
  if (isDirectContent(layout, courseName, slug)) {
    return <DirectContentView slug={slug} />;
  }

  // Flow-2, Flow-3 fall back to existing CourseLevels logic which already branches
  // Flow-2 = paper, Flow-3 = subject (and auto fallback)
  return <CourseSubjectsView slug={slug} />;
}
