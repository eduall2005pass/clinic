"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SubjectPapersView } from "@/components/dashboard/CourseLevels";
import { Flow4DirectSubjectView, Flow4SubjectView } from "@/components/dashboard/Flow4Student";
import { AccessLoading } from "@/components/auth/AccessGuard";

export default function SubjectRouter({ slug, subjectId }: { slug: string; subjectId: string }) {
  const { user, authLoading } = useAuth();
  const [layout, setLayout] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/my/courses/${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { course?: { contentLayout?: string } };
        setLayout(data.course?.contentLayout ?? "flow-1");
      } else {
        setLayout("flow-1");
      }
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
    return <AccessLoading label="Loading subject…" />;
  }

  if (layout === "flow-4") {
    // NEW spec direct: Subject → Content (no chapter)
    return <Flow4DirectSubjectView slug={slug} subjectId={subjectId} />;
  }

  // For flow-1/2/3, use existing my-learning hierarchy
  // Flow-3 Subject → Papers / Flow-1 direct will be handled elsewhere but subject direct shouldn't happen
  // Fallback to legacy chapter mode for any remaining flow-4 chapter data
  if (layout === "flow-1" || layout === "flow-2" || layout === "flow-3") {
    // Use the paper view for subject (papers/chapters) — matches original my-learning flow
    return <SubjectPapersView slug={slug} subjectId={subjectId} />;
  }

  // Default legacy Flow 4 chapter mode (kept for existing data)
  return <Flow4SubjectView slug={slug} subjectId={subjectId} />;
}
