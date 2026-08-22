"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
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

type Subject = { id: string; name: string; isActive: boolean };
type Chapter = { id: string; subjectId: string; name: string; isActive: boolean };

export default function ChaptersPage() {
  const gate = useAdminGate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const [subjectsResponse, chaptersResponse] = await Promise.all([
        fetch("/api/admin/course-subjects", { cache: "no-store" }),
        fetch("/api/admin/chapters", { cache: "no-store" }),
      ]);
      const subjectsData = (await subjectsResponse.json()) as { subjects?: Subject[] };
      const chaptersData = (await chaptersResponse.json()) as { chapters?: Chapter[] };
      setSubjects((subjectsData.subjects ?? []).filter((item) => item.isActive));
      setChapters(chaptersData.chapters ?? []);
    } catch {
      setChapters([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading chapters…" />
    );
  }

  async function create() {
    if (!name.trim() || !subjectId) {
      setNotice({ kind: "error", text: "Select a subject and enter a chapter name." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ name: name.trim(), subjectId }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; chapters?: Chapter[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setChapters(data?.chapters ?? []);
      setName("");
      setNotice({ kind: "success", text: "Chapter added." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this chapter and its classes?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/chapters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { chapters?: Chapter[] } | null;
      if (data?.chapters) setChapters(data.chapters);
    } finally {
      setBusy(false);
    }
  }

  const subjectName = (id: string) => subjects.find((item) => item.id === id)?.name ?? id;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Chapters</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Chapters grouped under each subject.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        {subjects.length === 0 ? (
          <p className="text-sm text-zinc-500">Add subjects first from Courses → Subjects.</p>
        ) : (
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div>
              <label className={labelClass} htmlFor="ch-subject">Subject</label>
              <select id="ch-subject" className={inputClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">Select…</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ch-name">Chapter name</label>
              <input id="ch-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className={buttonPrimaryClass}>+ Add</button>
            </div>
          </form>
        )}

        <ul className="mt-5 space-y-2">
          {(chapters ?? []).map((chapter) => (
            <li key={chapter.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-2.5 admin-dark:bg-zinc-800/60">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900 admin-dark:text-zinc-100">{chapter.name}</span>
                <span className="block truncate text-xs text-zinc-500">{subjectName(chapter.subjectId)}</span>
              </span>
              <button type="button" disabled={busy} aria-label={`Delete ${chapter.name}`} className={buttonDangerClass}
                onClick={() => void remove(chapter.id)}>
                ✕
              </button>
            </li>
          ))}
          {(chapters ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
              No chapters yet.
            </li>
          )}
        </ul>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
