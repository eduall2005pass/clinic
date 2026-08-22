"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  buttonPrimaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";
import { MediaUploadField } from "@/components/admin/MediaUploadField";

type Jersey = { id: string; name: string; note: string | null; image: string | null; price: number; isActive: boolean };

const EMPTY = { name: "", note: "", image: "", price: "0" };

export default function JerseyPage() {
  const gate = useAdminGate();
  const [jerseys, setJerseys] = useState<Jersey[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/jerseys", { cache: "no-store" });
      const data = (await response.json()) as { jerseys?: Jersey[] };
      setJerseys(data.jerseys ?? []);
    } catch {
      setJerseys([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading jerseys…" />
    );
  }

  async function save() {
    if (!form.name.trim()) {
      setNotice({ kind: "error", text: "Enter a jersey name." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/jerseys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ ...form, price: Number(form.price) || 0, isActive: true }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; jerseys?: Jersey[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setJerseys(data?.jerseys ?? []);
      setForm(EMPTY);
      setNotice({ kind: "success", text: "Jersey saved." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this jersey?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/jerseys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { jerseys?: Jersey[] } | null;
      if (data?.jerseys) setJerseys(data.jerseys);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Jerseys</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Merchandise jerseys shown on the website.</p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">Add jersey</h3>
        <form
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div>
            <label className="sr-only" htmlFor="jy-name">Name</label>
            <input id="jy-name" className={inputClass} placeholder="Name" value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="sr-only" htmlFor="jy-price">Price</label>
            <input id="jy-price" type="number" min="0" className={inputClass} placeholder="Price ৳" value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <MediaUploadField
              id="jy-image"
              label="Jersey image"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              directory="jerseys"
              preview
            />
          </div>
          <div className="sm:col-span-2">
            <label className="sr-only" htmlFor="jy-note">Note</label>
            <input id="jy-note" className={inputClass} placeholder="Short note" value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonPrimaryClass}>{busy ? "Saving…" : "+ Add Jersey"}</button>
          </div>
        </form>
      </div>

      <ul className="mt-5 space-y-2">
        {(jerseys ?? []).map((jersey) => (
          <li key={jersey.id} className={`${cardClass} flex items-center gap-3 px-4 py-3`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">{jersey.name}</span>
              <span className="block truncate text-xs text-zinc-500">
                ৳ {jersey.price.toLocaleString("en-IN")}{jersey.note ? ` · ${jersey.note}` : ""}
              </span>
            </span>
            <button type="button" disabled={busy} aria-label={`Delete ${jersey.name}`} className={buttonDangerClass}
              onClick={() => void remove(jersey.id)}>✕</button>
          </li>
        ))}
        {(jerseys ?? []).length === 0 && jerseys !== null && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
            No jerseys yet.
          </li>
        )}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
