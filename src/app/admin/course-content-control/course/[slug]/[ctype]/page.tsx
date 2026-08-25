"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Chapter = { id: string; name: string; classCount?: number };

/** Level 4 — chapter list of one content type, with [Edit] [+ Add Chapter]. */
export default function TypeChaptersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; ctype: string }>;
  searchParams: Promise<{ subject?: string; paper?: string }>;
}) {
  const { slug, ctype } = use(params);
  const sp = use(searchParams);

  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user!.getIdToken()}`,
    };
  }

  const qs = new URLSearchParams({ course: slug, ctype });
  if (sp.subject) qs.set("subject", sp.subject);
  if (sp.paper) qs.set("paper", sp.paper);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/admin/content-control?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      cache: "no-store",
    });
    const data = (await res.json()) as { chapters?: Chapter[] };
    setChapters(Array.isArray(data.chapters) ? data.chapters : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slug, ctype, sp.subject, sp.paper]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  async function post(body: Record<string, unknown>, success: string) {
    const res = await fetch("/api/admin/content-control", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({
        courseSlug: slug,
        ctype,
        ...(sp.subject ? { subjectId: sp.subject } : {}),
        ...(sp.paper ? { paperId: sp.paper } : {}),
        ...body,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.showToast("error", data.error ?? "Action failed.");
      return false;
    }
    toast.showToast("success", success);
    await load();
    return true;
  }

  const backHref = `/admin/course-content-control/course/${encodeURIComponent(slug)}${
    sp.subject ? `?subject=${encodeURIComponent(sp.subject)}` : ""
  }${sp.paper ? `${sp.subject ? "&" : "?"}paper=${encodeURIComponent(sp.paper)}` : ""}`;

  if (authLoading || !user || chapters === null)
    return <AccessLoading label="Loading chapters…" />;

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={backHref} className="text-sm font-semibold text-neutral-400 hover:text-primary-400">
        ← Back
      </Link>
      <h1 className="mt-3 break-words text-2xl font-extrabold capitalize text-heading">
        {ctype} — Chapters
      </h1>
      <p className="mt-1 text-xs text-neutral-500">
        Chapters belong only to this course{sp.paper ? " + paper" : ""}{sp.subject ? " + subject" : ""} scope.
      </p>

      {chapters.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No chapters yet. Use “+ Add Chapter” below.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {chapters.map((chapter) => (
            <li key={chapter.id} className="rounded-xl border border-ink/10 bg-dark-900 p-4">
              {editId === chapter.id ? (
                <div className="flex flex-wrap gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-primary-500/40 bg-dark-850 px-3 py-2 text-sm text-heading outline-none" />
                  <button type="button"
                    onClick={async () => {
                      if (await post({ action: "rename-chapter", id: chapter.id, name: editName }, "Chapter updated.")) setEditId(null);
                    }}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white">Save</button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex-1 break-words text-sm font-bold text-heading">{chapter.name}</span>
                  {typeof chapter.classCount === "number" && (
                    <span className="text-[11px] text-neutral-500">{chapter.classCount} classes</span>
                  )}
                  <Link
                    href={`/admin/courses/classes?chapter=${encodeURIComponent(chapter.id)}`}
                    className="rounded-lg border border-ink/15 bg-ink/5 px-3 py-1.5 text-[11px] font-bold text-heading hover:border-primary-500/60"
                  >
                    Open Content
                  </Link>
                  <button type="button"
                    onClick={() => { setEditId(chapter.id); setEditName(chapter.name); }}
                    className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Edit</button>
                  <button type="button"
                    onClick={async () => {
                      if (window.confirm(`Remove "${chapter.name}"?`)) await post({ action: "delete-chapter", id: chapter.id }, "Chapter removed.");
                    }}
                    className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400">Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setAdding((v) => !v)}
          className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">
          [ + Add Chapter ]
        </button>
        <button type="button" onClick={() => setEditId("__list__")}
          className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2 text-xs font-bold text-heading hover:border-primary-500/60">
          [ Edit ]
        </button>
      </div>
      {adding && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Chapter 13"
            className="min-w-0 flex-1 rounded-xl border border-primary-500/40 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none" />
          <button type="button"
            onClick={async () => {
              if (!newName.trim()) return;
              if (await post({ action: "add-chapter", name: newName.trim() }, "Chapter added.")) {
                setNewName(""); setAdding(false);
              }
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
          <button type="button" onClick={() => setAdding(false)}
            className="rounded-xl border border-ink/15 px-4 py-2.5 text-xs font-bold text-heading">Cancel</button>
        </div>
      )}
      {editId === "__list__" && (
        <p className="mt-3 text-xs text-neutral-500">
          Press Edit on any chapter above to rename it.
          <button type="button" onClick={() => setEditId(null)} className="ml-2 font-bold underline">Close</button>
        </p>
      )}
    </section>
  );
}
