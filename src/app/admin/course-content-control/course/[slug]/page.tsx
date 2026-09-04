"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import LegacyCourseContent from "@/components/admin/LegacyCourseContent";

type Subject = { id: string; name: string; sortOrder?: number };

// Flow 4 Level 2 — Course → Subjects (with router for existing 3 flows)
export default function CourseSubjectsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [layout, setLayout] = useState<string | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);

  // Determine course layout to branch: flow-4 vs legacy 1-3
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/courses?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { course?: { contentLayout?: string } };
          setLayout(data.course?.contentLayout ?? "flow-1");
        } else if (!cancelled) {
          setLayout("flow-1");
        }
      } catch {
        if (!cancelled) setLayout("flow-1");
      } finally {
        if (!cancelled) setLayoutLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, slug]);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/admin/flow4?course=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { subjects?: Subject[] };
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
    }
  }, [user, slug]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (layout !== "flow-4") return;
    void load();
  }, [authLoading, user, load, layout]);

  async function post(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const res = await fetch("/api/admin/flow4", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user!.getIdToken()}` },
      body: JSON.stringify({ course: slug, ...body }),
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

  if (authLoading || layoutLoading || !user) return <AccessLoading label="Loading course…" />;
  // Existing 3 flows: keep exactly as before via legacy component
  if (layout !== "flow-4") {
    return <LegacyCourseContent slug={slug} />;
  }
  if (subjects === null) return <AccessLoading label="Loading subjects…" />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/admin/course-content-control" className="text-sm font-semibold text-neutral-400 hover:text-[#1a3a78]">
        ← Course Content Control
      </Link>
      <h1 className="mt-3 break-words text-2xl font-extrabold capitalize text-heading">
        {decodeURIComponent(slug).replace(/-/g, " ")}
      </h1>
      <p className="mt-1 text-xs text-neutral-500">
        Flow 4 — <span className="font-bold">Course Content → Subject → Content</span> · Manage subjects for this course. Existing flows 1-3 remain unchanged.
      </p>

      {subjects.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No subjects yet. Add your first subject below.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {subjects.map((sub, idx) => (
            <li key={sub.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4">
              {editId === sub.id ? (
                <div className="flex flex-1 flex-wrap gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-primary-500/40 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-sm text-heading outline-none" />
                  <button type="button" disabled={busy} onClick={async () => { if (await post({ action: "edit-subject", id: sub.id, name: editName }, "Subject updated.")) setEditId(null); }} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white">Save</button>
                  <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Cancel</button>
                </div>
              ) : (
                <>
                  <Link href={`/admin/course-content-control/course/${encodeURIComponent(slug)}/subject/${encodeURIComponent(sub.id)}`} className="flex-1 break-words text-sm font-bold text-heading hover:text-primary-600">
                    {idx + 1}. {sub.name}
                  </Link>
                  <Link href={`/admin/course-content-control/course/${encodeURIComponent(slug)}/subject/${encodeURIComponent(sub.id)}`} className="rounded-lg border border-ink/15 bg-ink/5 px-3 py-1.5 text-[11px] font-bold text-heading hover:border-[#93c5fd]">Contents</Link>
                  <button type="button" onClick={() => { setEditId(sub.id); setEditName(sub.name); }} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Edit</button>
                  <button type="button" disabled={busy} onClick={async () => { if (window.confirm(`Delete "${sub.name}"?`)) await post({ action: "delete-subject", id: sub.id }, "Subject removed."); }} className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400">Remove</button>
                  <span className="flex gap-1">
                    <button type="button" disabled={busy || idx === 0} onClick={async () => { const ids = [...subjects]; [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]]; await post({ action: "reorder-subjects", orderedIds: ids.map((s) => s.id) }, "Reordered."); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-white text-slate-600 disabled:opacity-30">↑</button>
                    <button type="button" disabled={busy || idx === subjects.length - 1} onClick={async () => { const ids = [...subjects]; [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]; await post({ action: "reorder-subjects", orderedIds: ids.map((s) => s.id) }, "Reordered."); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 bg-white text-slate-600 disabled:opacity-30">↓</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setAdding((v) => !v)} className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">[ + Add Subject ]</button>
      </div>
      {adding && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Biology" className="min-w-0 flex-1 rounded-xl border border-primary-500/40 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none" />
          <button type="button" disabled={busy} onClick={async () => { if (!newName.trim()) return; if (await post({ action: "add-subject", name: newName.trim() }, "Subject added.")) { setNewName(""); setAdding(false); } }} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
          <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-ink/15 px-4 py-2.5 text-xs font-bold text-heading">Cancel</button>
        </div>
      )}
      <p className="mt-6 rounded-xl border border-dashed border-[#bfdbfe] bg-[#f8fbff]/70 px-4 py-3 text-center text-xs text-slate-500 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]/60">
        Flow 4 navigation: Course Content → Subject → Content. If a subject has no content → student sees &quot;No Content Available&quot; while navigation remains.
      </p>
    </section>
  );
}
