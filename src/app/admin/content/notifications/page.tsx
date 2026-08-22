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

type Notification = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "students" | "admins";
  isActive: boolean;
  createdAt: string;
};

const EMPTY = { title: "", message: "", audience: "all" as "all" | "students" | "admins" };

export default function NotificationsPage() {
  const gate = useAdminGate();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications?all=1", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { notifications?: Notification[] };
      setItems(data.notifications ?? []);
    } catch {
      setItems([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading notifications…" />
    );
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ ...form, isActive: true }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; notifications?: Notification[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setItems(data?.notifications ?? []);
      setForm(EMPTY);
      setNotice({ kind: "success", text: "Notification published." });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: Notification) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id: item.id, title: item.title, message: item.message, audience: item.audience, isActive: !item.isActive }),
      });
      const data = (await response.json().catch(() => null)) as { notifications?: Notification[] } | null;
      if (data?.notifications) setItems(data.notifications);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this notification?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { notifications?: Notification[] } | null;
      if (data?.notifications) setItems(data.notifications);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Notifications</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Broadcast notices to students or admins.</p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <form
          className="grid grid-cols-1 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <input className={inputClass} placeholder="Title" aria-label="Title" value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <textarea className={inputClass} rows={3} placeholder="Message" aria-label="Message" value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select className={`${inputClass} max-w-48`} value={form.audience} aria-label="Audience"
              onChange={(event) => setForm({ ...form, audience: event.target.value as typeof form.audience })}>
              <option value="all">Everyone</option>
              <option value="students">Students only</option>
              <option value="admins">Admins only</option>
            </select>
            <button type="submit" disabled={busy} className={buttonPrimaryClass}>{busy ? "Saving…" : "Publish"}</button>
          </div>
        </form>
      </div>

      <ul className="mt-5 space-y-2">
        {(items ?? []).map((item) => (
          <li key={item.id} className={`${cardClass} flex items-start gap-3 px-4 py-3`}>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-bold ${item.isActive ? "text-zinc-900 admin-dark:text-zinc-100" : "text-zinc-400 line-through"}`}>
                {item.title}
              </span>
              <span className="block line-clamp-2 text-xs text-zinc-500">{item.message}</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                {item.audience} · {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </span>
            <button type="button" onClick={() => void toggle(item)} disabled={busy} className="rounded-lg border border-neutral-200 px-2 py-1 text-[10px] font-extrabold uppercase text-zinc-500 admin-dark:border-zinc-700">
              {item.isActive ? "Hide" : "Show"}
            </button>
            <button type="button" disabled={busy} aria-label="Delete notification" className={buttonDangerClass}
              onClick={() => void remove(item.id)}>✕</button>
          </li>
        ))}
        {(items ?? []).length === 0 && items !== null && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
            No notifications yet.
          </li>
        )}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
