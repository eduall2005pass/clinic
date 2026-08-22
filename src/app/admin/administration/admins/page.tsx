"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAuth } from "@/lib/auth-context";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  buttonPrimaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type AdminAccount = { uid: string; displayName: string | null; email: string | null; createdAt?: string };

export default function AdminsPage() {
  const gate = useAdminGate();
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [form, setForm] = useState({ uid: "", email: "", displayName: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/accounts", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { admins?: AdminAccount[] };
      setAdmins(data.admins ?? []);
    } catch {
      setAdmins([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading admins…" />
    );
  }

  async function add() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; admins?: AdminAccount[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to add admin." });
        return;
      }
      setAdmins(data?.admins ?? []);
      setForm({ uid: "", email: "", displayName: "" });
      setNotice({ kind: "success", text: "Admin added." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    if (!window.confirm("Remove this admin's access?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ uid }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; admins?: AdminAccount[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to remove." });
        return;
      }
      setAdmins(data?.admins ?? []);
      setNotice({ kind: "success", text: "Admin removed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Admin Accounts</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          The Firebase account must already exist (signed in once). Adding it here grants panel access.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <input className={inputClass} placeholder="Firebase UID" aria-label="Firebase UID" value={form.uid}
            onChange={(event) => setForm({ ...form, uid: event.target.value.trim() })} />
          <input className={inputClass} type="email" placeholder="Email" aria-label="Email" value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value.trim() })} />
          <input className={inputClass} placeholder="Display name" aria-label="Display name" value={form.displayName}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
          <button type="submit" disabled={busy} className={buttonPrimaryClass}>+ Add</button>
        </form>
      </div>

      <ul className="mt-5 space-y-2">
        {(admins ?? []).map((admin) => {
          const isSelf = currentUser?.uid === admin.uid;
          return (
            <li key={admin.uid} className={`${cardClass} flex flex-wrap items-center gap-3 px-4 py-3`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                  {admin.displayName ?? "—"}{isSelf && " (you)"}
                </span>
                <span className="block truncate text-xs text-zinc-500">{admin.email}</span>
              </span>
              {!isSelf && (
                <button type="button" disabled={busy} aria-label={`Remove ${admin.email}`} className={buttonDangerClass}
                  onClick={() => void remove(admin.uid)}>✕</button>
              )}
            </li>
          );
        })}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
