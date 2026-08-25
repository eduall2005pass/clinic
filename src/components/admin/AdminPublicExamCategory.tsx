"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PublicExamList from "@/components/PublicExamList";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  type Notice,
} from "@/components/admin/admin-ui";
import { examToPublic } from "@/lib/public-exam-view";
import type { Exam } from "@/lib/exams-admin";
import {
  categorizeExam,
  categoryLabels,
  type ExamCategory,
  type PublicExam,
} from "@/lib/public-exams";

/**
 * Admin Panel mirror of the main website's /exam/category/[key] page — same
 * layout, sections (Live / Upcoming / Previous), cards, filters and
 * typography. Each card gets an extra admin row: Edit · Publish · Delete.
 * Draft exams are visible here too (with a DRAFT badge); students never see them.
 */
export default function AdminPublicExamCategory({
  category,
}: {
  category: ExamCategory;
}) {
  const gate = useAdminGate();
  const [exams, setExams] = useState<PublicExam[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/exams?kind=public,practice", {
        cache: "no-store",
        headers: gate.headers,
      });
      const data = (await response.json()) as { exams?: Exam[] };
      setExams((data.exams ?? []).map(examToPublic));
    } catch {
      setExams([]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- gate.headers is stable

  useEffect(() => {
    if (gate.ready) void load();
  }, [gate.ready, load]);

  async function togglePublish(exam: PublicExam) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          id: exam.id,
          status: exam.published ? "draft" : "published",
        }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to update." });
        return;
      }
      setNotice({
        kind: "success",
        text: exam.published
          ? `“${exam.name}” unpublished — hidden from students.`
          : `“${exam.name}” published — live on the website.`,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(exam: PublicExam) {
    if (
      !window.confirm(
        `Delete “${exam.name}” with its questions and results? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/exams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id: exam.id }),
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to delete." });
        return;
      }
      setNotice({ kind: "success", text: `“${exam.name}” deleted.` });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading exams…" />
    );
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <Link
          href="/admin/exams/public"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition hover:text-primary-400"
        >
          ← All Categories
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
          {categoryLabels[category]} Public Exams
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Live, upcoming and previous exams — click a card to open the same
          details page students see, with management controls.
        </p>
      </section>

      <PublicExamList
        exams={exams ?? []}
        batches={["HSC 26", "HSC 27", "HSC 28"]}
        category={category}
        detailsBase="/admin/exams/public/exam"
        showDrafts
        renderManage={(exam) => (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
            <Link
              href={`/admin/exams/public/exam/${encodeURIComponent(exam.id)}`}
              className="flex-1 rounded-lg border border-primary-500/40 bg-primary-600/10 px-3 py-2 text-center text-xs font-bold text-primary-300 transition hover:bg-primary-600/20"
            >
              ✎ Edit
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void togglePublish(exam)}
              className="flex-1 rounded-lg border border-ink/15 bg-dark-850 px-3 py-2 text-xs font-bold text-neutral-300 transition hover:border-primary-500/50 hover:text-heading disabled:opacity-50"
            >
              {exam.published ? "Unpublish" : "Publish"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(exam)}
              aria-label={`Delete ${exam.name}`}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      />

      {exams !== null &&
        exams.every((exam) => categorizeExam(exam) !== category) && (
          <p className="sr-only">No exams in this category yet.</p>
        )}

      {notice && (
        <p
          role="status"
          className={`mx-auto max-w-6xl px-4 pb-8 text-sm font-semibold sm:px-6 ${
            notice.kind === "error" ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {notice.text}
        </p>
      )}
    </main>
  );
}
