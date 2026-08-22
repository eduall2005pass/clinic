"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Item = { id: string; name: string; isActive: boolean };

export default function SubjectsPage() {
  const gate = useAdminGate();
  const [items, setItems] = useState<Item[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/course-subjects", { cache: "no-store" });
      const data = (await response.json()) as { subjects?: Item[] };
      setItems(data.subjects ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading subjects…" />
    );
  }

  async function mutate(init: RequestInit & { method: string }, body?: unknown) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/course-subjects", {
        ...init,
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; subjects?: Item[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Request failed." });
        return;
      }
      if (data?.subjects) setItems(data.subjects);
      setNotice({ kind: "success", text: "Subjects updated." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Subjects</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Subject list used across courses and the question bank.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            void mutate({ method: "PUT" }, { subjects: [...(items ?? []), { name: name.trim(), isActive: true }] }).then(() => setName(""));
          }}
        >
          <input className={`${inputClass} min-w-0 flex-1`} placeholder="New subject name…" value={name}
            onChange={(event) => setName(event.target.value)} aria-label="Subject name" />
          <button type="submit" disabled={busy || !name.trim()} className={buttonPrimaryClass}>+ Add</button>
        </form>

        <ul className="mt-4 space-y-2">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-2.5 admin-dark:bg-zinc-800/60">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={item.isActive} aria-label={`Enable ${item.name}`}
                  onChange={(event) =>
                    void mutate(
                      { method: "PUT" },
                      { subjects: (items ?? []).map((row) => (row.id === item.id ? { ...row, isActive: event.target.checked } : row)) },
                    )
                  } />
              </label>
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${item.isActive ? "text-zinc-900 admin-dark:text-zinc-100" : "text-zinc-400 line-through"}`}>
                {item.name}
              </span>
              <button type="button" disabled={busy} aria-label={`Delete ${item.name}`} className={buttonDangerClass}
                onClick={() => void mutate({ method: "DELETE" }, { id: item.id })}>
                ✕
              </button>
            </li>
          ))}
          {(items ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
              No subjects yet.
            </li>
          )}
        </ul>

        <button
          type="button"
          className={`${buttonSecondaryClass} mt-4`}
          disabled={busy}
          onClick={() => void mutate({ method: "PUT" }, { subjects: items ?? [] })}
        >
          Save order/changes
        </button>
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
