"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Subject = { id: string; name: string };
type Paper = { id: string; subjectId: string; name: string; kind: "paper" | "segment"; isActive: boolean };
type Chapter = { id: string; name: string; paperId: string | null };
type Material = { id: number; chapterId: string; title: string; materialType: string; fileUrl: string };

const MATERIAL_TYPES = ["pdf", "slide", "note", "link", "other"];

export default function PapersPage() {
  const gate = useAdminGate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", ...gate.headers }),
    [gate.headers],
  );

  // Load subjects once.
  useEffect(() => {
    if (!gate.ready) return;
    (async () => {
      try {
        const response = await fetch("/api/admin/course-subjects", {
          cache: "no-store",
          headers: gate.headers,
        });
        const data = (await response.json()) as { subjects?: Subject[] };
        setSubjects(data.subjects ?? []);
      } catch {
        setSubjects([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.ready]);

  const loadSubjectData = useCallback(async () => {
    if (!subjectId) return;
    setMaterials(null);
    try {
      const [papersRes, chaptersRes] = await Promise.all([
        fetch(`/api/admin/papers?subjectId=${encodeURIComponent(subjectId)}`, {
          cache: "no-store",
          headers: gate.headers,
        }),
        fetch(`/api/admin/chapters?subjectId=${encodeURIComponent(subjectId)}`, {
          cache: "no-store",
          headers: gate.headers,
        }),
      ]);
      const papersData = (await papersRes.json()) as { papers?: Paper[] };
      const chaptersData = (await chaptersRes.json()) as { chapters?: Chapter[] };
      setPapers(papersData.papers ?? []);
      setChapters(chaptersData.chapters ?? []);
    } catch {
      setPapers([]);
      setChapters([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useEffect(() => {
    if (!gate.ready) return;
    let cancelled = false;
    const run = async () => {
      await loadSubjectData();
    };
    // Defer the fetch out of the synchronous effect body.
    void Promise.resolve().then(() => {
      if (!cancelled) return run();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.ready, subjectId]);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method,
        headers: headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Request failed." });
        return false;
      }
      return true;
    } catch {
      setNotice({ kind: "error", text: "Network error." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading papers…" />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-heading">Papers &amp; Materials</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Manage ১ম/২য় পত্র per subject, assign chapters to papers and manage PDF/materials per chapter.
        </p>
      </header>

      {/* Subject selector */}
      <section className={cardClass}>
        <label className={labelClass} htmlFor="paper-subject">
          Subject
        </label>
        <select
          id="paper-subject"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className={inputClass}
        >
          <option value="">Select a subject…</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </section>

      {notice && <p className={noticeClass(notice)} role="status">{notice.text}</p>}

      {subjectId && (
        <>
          <PapersManager
            subjectId={subjectId}
            papers={papers}
            chapters={chapters}
            busy={busy}
            reload={loadSubjectData}
            call={call}
            setNotice={setNotice}
          />
          <MaterialsManager
            chapters={chapters}
            materials={materials}
            setMaterials={setMaterials}
            busy={busy}
            call={call}
            setNotice={setNotice}
          />
        </>
      )}
    </div>
  );
}

function PapersManager({
  subjectId,
  papers,
  chapters,
  busy,
  reload,
  call,
  setNotice,
}: {
  subjectId: string;
  papers: Paper[];
  chapters: Chapter[];
  busy: boolean;
  reload: () => Promise<void>;
  call: (url: string, method: string, body?: unknown) => Promise<boolean>;
  setNotice: (n: Notice | null) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"paper" | "segment">("paper");

  async function addPaper() {
    if (!newName.trim()) {
      setNotice({ kind: "error", text: "Enter a paper name (e.g. জীববিজ্ঞান ১ম পত্র)." });
      return;
    }
    const ok = await call("/api/admin/papers", "POST", {
      subjectId,
      name: newName.trim(),
      kind: newKind,
    });
    if (ok) {
      setNewName("");
      await reload();
      setNotice({ kind: "success", text: "Paper added." });
    }
  }

  async function move(paperId: string, direction: -1 | 1) {
    const order = papers.map((paper) => paper.id);
    const from = order.indexOf(paperId);
    const to = from + direction;
    if (to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    if (await call("/api/admin/papers", "PUT", { order })) await reload();
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-bold text-heading">Papers</h2>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[200px]">
          <span className={labelClass}>New paper name</span>
          <input
            className={inputClass}
            value={newName}
            placeholder="জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)"
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Type</span>
          <select
            className={inputClass}
            value={newKind}
            onChange={(event) => setNewKind(event.target.value as "paper" | "segment")}
          >
            <option value="paper">Paper (পত্র)</option>
            <option value="segment">Segment</option>
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => void addPaper()} className={buttonPrimaryClass}>
          Add Paper
        </button>
      </div>

      <ul className="mt-5 space-y-2.5">
        {papers.map((paper, index) => (
          <li key={paper.id} className="rounded-xl border border-ink/10 bg-dark-950/60 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-heading">{index + 1}. {paper.name}</span>
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500">
                {paper.kind}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <button type="button" disabled={busy || index === 0} onClick={() => void move(paper.id, -1)} className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-neutral-300 disabled:opacity-40" aria-label="Move up">↑</button>
                <button type="button" disabled={busy || index === papers.length - 1} onClick={() => void move(paper.id, 1)} className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-neutral-300 disabled:opacity-40" aria-label="Move down">↓</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`Delete "${paper.name}"? Its chapters become unassigned.`)) return;
                    if (await call("/api/admin/papers", "DELETE", { id: paper.id })) await reload();
                  }}
                  className={buttonDangerClass + " px-3 py-1 text-xs"}
                >
                  Delete
                </button>
              </span>
            </div>

            {/* Chapter → paper assignment */}
            {chapters.length > 0 && (
              <div className="mt-3 border-t border-ink/10 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Chapters in this paper
                </p>
                <div className="mt-2 space-y-1.5">
                  {chapters.map((chapter) => (
                    <div key={chapter.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-neutral-300">{chapter.name}</span>
                      <select
                        aria-label={`Assign ${chapter.name} to a paper`}
                        value={chapter.paperId ?? ""}
                        disabled={busy}
                        onChange={async (event) => {
                          const ok = await call("/api/admin/papers", "PATCH", {
                            chapterId: chapter.id,
                            paperId: event.target.value || null,
                          });
                          if (ok) await reload();
                        }}
                        className="rounded-lg border border-ink/15 bg-dark-850 px-2 py-1 text-xs text-heading"
                      >
                        <option value="">— Not assigned —</option>
                        {papers.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {papers.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">No papers yet — add the ১ম/২য় পত্র above.</p>
      )}
    </section>
  );
}

function MaterialsManager({
  chapters,
  materials,
  setMaterials,
  busy,
  call,
  setNotice,
}: {
  chapters: Chapter[];
  materials: Material[] | null;
  setMaterials: (items: Material[] | null) => void;
  busy: boolean;
  call: (url: string, method: string, body?: unknown) => Promise<boolean>;
  setNotice: (n: Notice | null) => void;
}) {
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pdf");
  const [fileUrl, setFileUrl] = useState("");
  const [reorderBusy, setReorderBusy] = useState(false);

  const loadMaterials = useCallback(async () => {
    if (!chapterId) return;
    try {
      const response = await fetch(`/api/admin/materials?chapterId=${encodeURIComponent(chapterId)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { materials?: Material[] };
      setMaterials(data.materials ?? []);
    } catch {
      setMaterials([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  useEffect(() => {
    if (chapterId) void loadMaterials();
    else setMaterials(null);
  }, [chapterId, loadMaterials]);

  async function move(index: number, direction: -1 | 1) {
    if (!materials) return;
    const target = index + direction;
    if (target < 0 || target >= materials.length) return;
    const next = [...materials];
    [next[index], next[target]] = [next[target], next[index]];
    setReorderBusy(true);
    try {
      const ok = await call("/api/admin/materials", "PUT", {
        order: next.map((item) => item.id),
      });
      if (ok) await loadMaterials();
    } finally {
      setReorderBusy(false);
    }
  }

  async function addMaterial() {
    if (!chapterId || !title.trim() || !fileUrl.trim()) {
      setNotice({ kind: "error", text: "Select a chapter and fill in title + file URL." });
      return;
    }
    const ok = await call("/api/admin/materials", "POST", {
      chapterId,
      title: title.trim(),
      materialType: type,
      fileUrl: fileUrl.trim(),
    });
    if (ok) {
      setTitle("");
      setFileUrl("");
      await loadMaterials();
      setNotice({ kind: "success", text: "Material added." });
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-bold text-heading">Materials</h2>

      <label className={`${labelClass} mt-4 block`}>
        Chapter
      </label>
      <select
        className={inputClass}
        value={chapterId}
        onChange={(event) => setChapterId(event.target.value)}
      >
        <option value="">Select a chapter…</option>
        {chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.id}>
            {chapter.name}
          </option>
        ))}
      </select>

      {chapterId && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Title</span>
              <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Type</span>
              <select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}>
                {MATERIAL_TYPES.map((item) => (
                  <option key={item} value={item}>{item.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>PDF file or link</span>
              <MediaUploadField
                id={`material-file-${chapterId}`}
                value={fileUrl}
                onChange={(url) => setFileUrl(url)}
                directory="course-materials"
                accept="application/pdf,.pdf"
                placeholder="Upload a PDF or paste a link"
              />
            </label>
          </div>
          <button type="button" disabled={busy} onClick={() => void addMaterial()} className={buttonPrimaryClass + " mt-4"}>
            Add / Update Material
          </button>

          {materials !== null && (
            <ul className="mt-5 space-y-2">
              {materials.length === 0 && (
                <li className="text-sm text-neutral-500">No materials for this chapter yet.</li>
              )}
              {materials.map((material, index) => (
                <li key={material.id} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-dark-950/60 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">
                    {index + 1}. {material.title}{" "}
                    <span className="text-[10px] font-bold uppercase text-neutral-500">{material.materialType}</span>
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <button type="button" disabled={reorderBusy || index === 0}
                      aria-label={`Move ${material.title} up`}
                      onClick={() => void move(index, -1)}
                      className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-neutral-300 disabled:opacity-40">↑</button>
                    <button type="button" disabled={reorderBusy || index === materials.length - 1}
                      aria-label={`Move ${material.title} down`}
                      onClick={() => void move(index, 1)}
                      className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-neutral-300 disabled:opacity-40">↓</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (!window.confirm(`Delete material "${material.title}"?`)) return;
                        if (await call("/api/admin/materials", "DELETE", { id: material.id })) {
                          await loadMaterials();
                        }
                      }}
                      className={buttonDangerClass + " px-3 py-1 text-xs"}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
