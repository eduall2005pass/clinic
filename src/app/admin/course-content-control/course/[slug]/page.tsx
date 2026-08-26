"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Types = { typeKey: string; name: string };
type Structure = {
  mode: "direct" | "subjects" | "papers";
  types?: Types[];
  subjects?: Array<{ id: string; name: string }>;
  papers?: Array<{ id: string; name: string; subjectId: string }>;
};

const TYPE_ICONS: Record<string, string> = {
  class: "🎥", exam: "📝", materials: "📄", archive: "🗄️",
};

/** Level 3 — course content structure (types / subjects / papers). */
export default function CourseContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [scope, setScope] = useState<{ subjectId?: string; paperId?: string; label?: string }>({});
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user!.getIdToken()}`,
    };
  }

  const load = useCallback(async () => {
    if (!user) return;
    const qs = new URLSearchParams({ course: slug, ...(scope.subjectId ? { subject: scope.subjectId } : {}), ...(scope.paperId ? { paper: scope.paperId } : {}) });
    const res = await fetch(`/api/admin/content-control?${qs}`, {
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      cache: "no-store",
    });
    if (res.ok) setStructure((await res.json()) as Structure);
  }, [user, slug, scope]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  async function post(body: Record<string, unknown>, success: string) {
    const res = await fetch("/api/admin/content-control", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ courseSlug: slug, ...scope, ...body }),
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

  if (authLoading || !structure || !user)
    return <AccessLoading label="Loading course structure…" />;

  const baseQuery = new URLSearchParams({ course: slug });
  if (scope.subjectId) baseQuery.set("subject", scope.subjectId);
  if (scope.paperId) baseQuery.set("paper", scope.paperId);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/admin/course-content-control" className="text-sm font-semibold text-neutral-400 hover:text-primary-400">
        ← Course Content Control
      </Link>
      <h1 className="mt-3 break-words text-2xl font-extrabold capitalize text-heading">
        {decodeURIComponent(slug).replace(/-/g, " ")}
      </h1>

      {/* Subject / Paper selection levels */}
      {!scope.subjectId && !scope.paperId && structure.mode === "subjects" && (
        <>
          <h2 className="mt-6 text-lg font-bold text-heading">Select Subject</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(structure.subjects ?? []).map((subject) => (
              <button key={subject.id} type="button"
                onClick={() => setScope({ subjectId: subject.id, label: subject.name })}
                className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-5 text-left transition hover:border-primary-600/60">
                <span aria-hidden>📗</span>
                <span className="break-words font-extrabold text-heading">{subject.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">Subjects sync from Course Control.</p>
        </>
      )}
      {structure.mode === "papers" && !scope.paperId && !scope.subjectId && (
        <>
          <h2 className="mt-6 text-lg font-bold text-heading">Select Paper</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(structure.papers ?? []).map((paper) => (
              <button key={paper.id} type="button"
                onClick={() => setScope({ paperId: paper.id, subjectId: paper.subjectId, label: paper.name })}
                className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-5 text-left transition hover:border-primary-600/60">
                <span aria-hidden>📄</span>
                <span className="break-words font-extrabold text-heading">{paper.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Content-type level */}
      {(structure.mode === "direct" || scope.subjectId || scope.paperId) && (
        <>
          {scope.label && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary-500/40 bg-primary-600/10 px-3 py-1 text-xs font-bold text-primary-300">
              {scope.label}
              <button
                type="button"
                aria-label="Clear selection"
                onClick={() => setScope({})}
                className="rounded-full px-1 text-[11px] font-extrabold text-primary-200 hover:text-white"
              >
                ✕
              </button>
            </p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(structure.types ?? []).map((type) => (
              <Link key={type.typeKey}
                href={`/admin/course-content-control/course/${encodeURIComponent(slug)}/${type.typeKey}?${baseQuery.toString()}`}
                className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-primary-600/60">
                <span aria-hidden className="text-xl">{TYPE_ICONS[type.typeKey] ?? "📁"}</span>
                <span className="flex-1 break-words font-extrabold text-heading group-hover:text-primary-400">{type.name}</span>
              </Link>
            ))}
          </div>

          {/* Edit / + Add for the content-type list */}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button"
              onClick={() =>
                editingKey === null
                  ? setEditingKey("__list__")
                  : setEditingKey(null)
              }
              className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2 text-xs font-bold text-heading hover:border-primary-500/60">
              [ Edit ]
            </button>
            <button type="button" onClick={() => setAddingType((v) => !v)}
              className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">
              [ + Add ]
            </button>
          </div>
          {addingType && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="New content type name (e.g. Quiz)"
                className="min-w-0 flex-1 rounded-xl border border-primary-500/40 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none" />
              <button type="button"
                onClick={async () => {
                  if (await post({ action: "add-type", name: newTypeName }, "Content type added.")) {
                    setNewTypeName(""); setAddingType(false);
                  }
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
              <button type="button" onClick={() => setAddingType(false)}
                className="rounded-xl border border-ink/15 px-4 py-2.5 text-xs font-bold text-heading">Cancel</button>
            </div>
          )}
          {editingKey === "__list__" && (
            <ul className="mt-3 space-y-2">
              {(structure.types ?? []).map((type) => (
                <li key={type.typeKey} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 bg-dark-950/60 p-3">
                  {editingKey === type.typeKey ? (
                    <>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-primary-500/40 bg-dark-850 px-3 py-2 text-sm text-heading outline-none" />
                      <button type="button"
                        onClick={async () => {
                          if (await post({ action: "rename-type", typeKey: type.typeKey, name: editName }, "Renamed.")) setEditingKey(null);
                        }}
                        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white">Save</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 break-words text-sm font-semibold text-heading">{type.name}</span>
                      <button type="button"
                        onClick={() => { setEditingKey(type.typeKey); setEditName(type.name); }}
                        className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading">Rename</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
