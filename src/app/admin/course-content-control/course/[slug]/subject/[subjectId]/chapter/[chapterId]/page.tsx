"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Content = { id: string; title: string; contentType: string; videoUrl: string | null; fileUrl: string | null; durationMinutes: number };

// Flow 4 Level 4 — Chapter → Contents
export default function ChapterContentsPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string; chapterId: string }>;
}) {
  const { slug, subjectId, chapterId } = use(params);
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [contents, setContents] = useState<Content[] | null>(null);
  const [form, setForm] = useState({ title: "", contentType: "class", videoUrl: "", fileUrl: "", durationMinutes: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await fetch(
      `/api/admin/flow4?course=${encodeURIComponent(slug)}&subject=${encodeURIComponent(subjectId)}&chapter=${encodeURIComponent(chapterId)}`,
      { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as { contents?: Content[] };
      setContents(Array.isArray(data.contents) ? data.contents : []);
    }
  }, [user, slug, subjectId, chapterId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  async function post(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const res = await fetch("/api/admin/flow4", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user!.getIdToken()}` },
      body: JSON.stringify({ course: slug, subjectId, chapterId, ...body }),
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

  async function handleSave() {
    if (!form.title.trim()) { toast.showToast("error", "Title is required."); return; }
    if (editingId) {
      await post({ action: "edit-content", id: editingId, title: form.title.trim(), contentType: form.contentType, videoUrl: form.videoUrl.trim() || null, fileUrl: form.fileUrl.trim() || null, durationMinutes: Number(form.durationMinutes) || 0 }, "Content updated.");
      setEditingId(null);
    } else {
      await post({ action: "add-content", chapterId, title: form.title.trim(), contentType: form.contentType, videoUrl: form.videoUrl.trim() || null, fileUrl: form.fileUrl.trim() || null, durationMinutes: Number(form.durationMinutes) || 0 }, "Content added.");
    }
    setForm({ title: "", contentType: "class", videoUrl: "", fileUrl: "", durationMinutes: "0" });
  }

  if (authLoading || contents === null || !user) return <AccessLoading label="Loading contents…" />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/admin/course-content-control/course/${encodeURIComponent(slug)}/subject/${encodeURIComponent(subjectId)}`} className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]">← Back to Chapters</Link>
      <h1 className="mt-3 text-xl font-extrabold text-heading">Chapter Contents</h1>
      <p className="mt-1 text-xs text-neutral-500">Add Class, Notes, PDF etc. inside this chapter.</p>

      {/* Add / Edit form */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4 sm:p-5">
        <h2 className="text-sm font-extrabold text-heading">{editingId ? "Edit Content" : "Add Content"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 admin-dark:text-slate-300">Title *</label>
            <input placeholder="e.g. Class 1, Notes 01" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-xl border border-primary-500/40 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 admin-dark:text-slate-300">Type</label>
            <select value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none">
              <option value="class">Class</option>
              <option value="note">Note</option>
              <option value="pdf">PDF</option>
              <option value="slide">Slide</option>
              <option value="link">Link</option>
              <option value="exam">Exam</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 admin-dark:text-slate-300">Duration (min)</label>
            <input type="number" min="0" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 admin-dark:text-slate-300">Video URL (YouTube etc.)</label>
            <input placeholder="https://www.youtube.com/watch?v=..." value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 admin-dark:text-slate-300">File URL (PDF/Note)</label>
            <input placeholder="https://..." value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none" />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: "", contentType: "class", videoUrl: "", fileUrl: "", durationMinutes: "0" }); }} className="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>}
            <button type="button" disabled={busy} onClick={() => void handleSave()} className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700">{editingId ? "Save" : "+ Add Content"}</button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-heading">Contents — {contents.length}</h3>
        {contents.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">No content yet. Add Class 1, Notes etc. above.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {contents.map((c, idx) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dbeafe] bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600/15 text-xs font-black text-primary-600">{String(idx + 1).padStart(2, "0")}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-bold text-heading">{c.title}</span>
                  <span className="text-xs text-neutral-500">{c.contentType} {c.durationMinutes > 0 ? `· ${c.durationMinutes} min` : ""}</span>
                </span>
                <button type="button" onClick={() => { setEditingId(c.id); setForm({ title: c.title, contentType: c.contentType, videoUrl: c.videoUrl ?? "", fileUrl: c.fileUrl ?? "", durationMinutes: String(c.durationMinutes) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Edit</button>
                <button type="button" disabled={busy} onClick={async () => { if (window.confirm(`Delete "${c.title}"?`)) await post({ action: "delete-content", id: c.id }, "Removed."); }} className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400">Delete</button>
                <span className="flex gap-1">
                  <button type="button" disabled={busy || idx === 0} onClick={async () => { const ids = [...contents]; [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]]; await post({ action: "reorder-contents", orderedIds: ids.map((x) => x.id) }, "Reordered."); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-white text-slate-600 disabled:opacity-30">↑</button>
                  <button type="button" disabled={busy || idx === contents.length - 1} onClick={async () => { const ids = [...contents]; [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]; await post({ action: "reorder-contents", orderedIds: ids.map((x) => x.id) }, "Reordered."); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-white text-slate-600 disabled:opacity-30">↓</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
