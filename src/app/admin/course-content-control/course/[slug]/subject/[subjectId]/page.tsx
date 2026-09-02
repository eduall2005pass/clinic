"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Chapter = { id: string; name: string; sortOrder?: number };

// Flow 4 Level 3 — Subject → Chapters
export default function SubjectChaptersPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = use(params);
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await fetch(
      `/api/admin/flow4?course=${encodeURIComponent(slug)}&subject=${encodeURIComponent(subjectId)}`,
      { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as { chapters?: Chapter[] };
      setChapters(Array.isArray(data.chapters) ? data.chapters : []);
    }
  }, [user, slug, subjectId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  async function post(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const res = await fetch("/api/admin/flow4", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user!.getIdToken()}` },
      body: JSON.stringify({ course: slug, subjectId, ...body }),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      toast.showToast("error", data.error ?? "Action failed.");
      return false;
    }
    toast.showToast("success", success);
    await load();
    return true;
  }

  if (authLoading || chapters === null || !user) return <AccessLoading label="Loading chapters…" />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/admin/course-content-control/course/${encodeURIComponent(slug)}`} className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]">
        ← {decodeURIComponent(slug).replace(/-/g, " ")}
      </Link>
      <h1 className="mt-3 text-xl font-extrabold text-heading">Chapters</h1>
      <p className="mt-1 text-xs text-neutral-500">Subject → Chapter → Content · Manage chapters for this subject.</p>

      {chapters.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No chapters yet. Add your first chapter below.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {chapters.map((ch, idx) => (
            <li key={ch.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4">
              {editId === ch.id ? (
                <div className="flex flex-1 flex-wrap gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-primary-500/40 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-sm text-heading outline-none" />
                  <button type="button" disabled={busy} onClick={async () => { if (await post({ action: "edit-chapter", id: ch.id, name: editName }, "Chapter updated.")) setEditId(null); }} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white">Save</button>
                  <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Cancel</button>
                </div>
              ) : (
                <>
                  <span className="flex-1 break-words text-sm font-bold text-heading">{idx + 1}. {ch.name}</span>
                  <Link href={`/admin/course-content-control/course/${encodeURIComponent(slug)}/subject/${encodeURIComponent(subjectId)}/chapter/${encodeURIComponent(ch.id)}`} className="rounded-lg border border-ink/15 bg-ink/5 px-3 py-1.5 text-[11px] font-bold text-heading hover:border-[#93c5fd]">Contents</Link>
                  <button type="button" onClick={() => { setEditId(ch.id); setEditName(ch.name); }} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Edit</button>
                  <button type="button" disabled={busy} onClick={async () => { if (window.confirm(`Delete "${ch.name}"?`)) await post({ action: "delete-chapter", id: ch.id }, "Chapter removed."); }} className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400">Remove</button>
                  <span className="flex gap-1">
                    <button type="button" disabled={busy || idx === 0} onClick={async () => { const ids = [...chapters]; [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]]; await post({ action: "reorder-chapters", orderedIds: ids.map((c) => c.id) }, "Reordered."); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-white text-slate-600 disabled:opacity-30">↑</button>
                    <button type="button" disabled={busy || idx === chapters.length - 1} onClick={async () => { const ids = [...chapters]; [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]; await post({ action: "reorder-chapters", orderedIds: ids.map((c) => c.id) }, "Reordered."); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-white text-slate-600 disabled:opacity-30">↓</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setAdding((v) => !v)} className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">[ + Add Chapter ]</button>
      </div>
      {adding && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Chapter 1" className="min-w-0 flex-1 rounded-xl border border-primary-500/40 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none" />
          <button type="button" disabled={busy} onClick={async () => { if (!newName.trim()) return; if (await post({ action: "add-chapter", name: newName.trim() }, "Chapter added.")) { setNewName(""); setAdding(false); } }} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
          <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-ink/15 px-4 py-2.5 text-xs font-bold text-heading">Cancel</button>
        </div>
      )}
    </section>
  );
}
