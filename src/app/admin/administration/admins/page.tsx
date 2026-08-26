"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAuth } from "@/lib/auth-context";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type AdminAccount = {
  uid: string;
  displayName: string | null;
  email: string | null;
  role?: string | null;
  isActive?: number | boolean | null;
  createdAt?: string;
};

const ROLES = [
  "super-admin",
  "admin",
  "content-manager",
  "course-manager",
  "exam-manager",
] as const;

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  "content-manager": "Content Manager",
  "course-manager": "Course Manager",
  "exam-manager": "Exam Manager",
};

const roleBadgeClass: Record<string, string> = {
  "super-admin": "bg-violet-100 text-violet-800 admin-dark:bg-violet-500/15 admin-dark:text-violet-300",
  admin: "bg-sky-100 text-sky-800 admin-dark:bg-sky-500/15 admin-dark:text-sky-300",
  "content-manager": "bg-emerald-100 text-emerald-800 admin-dark:bg-emerald-500/15 admin-dark:text-emerald-300",
  "course-manager": "bg-indigo-100 text-indigo-800 admin-dark:bg-indigo-500/15 admin-dark:text-indigo-300",
  "exam-manager": "bg-amber-100 text-amber-800 admin-dark:bg-amber-500/15 admin-dark:text-amber-300",
};

export default function AdminsPage() {
  const gate = useAdminGate();
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [form, setForm] = useState({ uid: "", email: "", displayName: "", role: "admin" });
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [edit, setEdit] = useState({ email: "", displayName: "" });
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

  function apply(data: { admins?: AdminAccount[] }, success: string) {
    setAdmins(data.admins ?? []);
    setNotice({ kind: "success", text: success });
  }

  async function send(
    method: string,
    body: Record<string, unknown>,
    success: string,
  ): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/accounts", {
        method,
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; admins?: AdminAccount[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Request failed." });
        return;
      }
      apply(data ?? {}, success);
      return;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    await send("PUT", form, "Admin added.");
    setForm({ uid: "", email: "", displayName: "", role: "admin" });
  }

  async function saveEdit(uid: string) {
    await send("PATCH", { uid, ...edit }, "Admin updated.");
    setEditingUid(null);
  }

  async function assignRole(uid: string, role: string) {
    await send("PATCH", { uid, role }, `Role assigned: ${role}.`);
  }

  async function toggleActive(admin: AdminAccount) {
    const next = !admin.isActive;
    await send("POST", { uid: admin.uid, isActive: next }, next ? "Admin activated." : "Admin deactivated.");
  }

  async function remove(uid: string) {
    if (!window.confirm("Remove this admin's access?")) return;
    await send("DELETE", { uid }, "Admin removed.");
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Admin Management</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">
          The Firebase account must already exist (signed in once). At least one authorized administrator must always remain.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <h3 className="text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">Add admin</h3>
        <form
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
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
          <select className={inputClass} aria-label="Role" value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>
          <button type="submit" disabled={busy} className={buttonPrimaryClass}>+ Add</button>
        </form>
      </div>

      <ul className="mt-5 space-y-2">
        {(admins ?? []).map((admin) => {
          const isSelf = currentUser?.uid === admin.uid;
          const active = Boolean(admin.isActive);
          const role = admin.role && (ROLES as readonly string[]).includes(admin.role) ? admin.role : "admin";
          const isEditing = editingUid === admin.uid;
          return (
            <li key={admin.uid} className={`${cardClass} px-4 py-3`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">
                      {admin.displayName ?? "—"}{isSelf && " (you)"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass[role]}`}>{ROLE_LABELS[role] ?? role}</span>
                    {!active && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 admin-dark:bg-red-500/15 admin-dark:text-red-300">
                        deactivated
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{admin.email}</span>
                </span>
                <label className="sr-only" htmlFor={`role-${admin.uid}`}>Role for {admin.email}</label>
                <select
                  id={`role-${admin.uid}`}
                  className={`${inputClass} w-auto py-1.5 text-xs`}
                  disabled={busy}
                  value={role}
                  onChange={(event) => void assignRole(admin.uid, event.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  className={active ? buttonSecondaryClass : buttonPrimaryClass}
                  onClick={() => void toggleActive(admin)}
                >
                  {active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={buttonSecondaryClass}
                  onClick={() => {
                    setEditingUid(isEditing ? null : admin.uid);
                    setEdit({ email: admin.email ?? "", displayName: admin.displayName ?? "" });
                  }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
                {!isSelf && (
                  <button type="button" disabled={busy} aria-label={`Remove ${admin.email}`} className={buttonDangerClass}
                    onClick={() => void remove(admin.uid)}>✕</button>
                )}
              </div>

              {isEditing && (
                <form
                  className="mt-3 grid grid-cols-1 gap-3 border-t border-zinc-200 pt-3 sm:grid-cols-[1fr_1fr_auto] admin-dark:border-zinc-700"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveEdit(admin.uid);
                  }}
                >
                  <div>
                    <label className={labelClass} htmlFor={`edit-email-${admin.uid}`}>Email</label>
                    <input id={`edit-email-${admin.uid}`} className={inputClass} type="email" value={edit.email}
                      onChange={(event) => setEdit({ ...edit, email: event.target.value.trim() })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`edit-name-${admin.uid}`}>Display name</label>
                    <input id={`edit-name-${admin.uid}`} className={inputClass} value={edit.displayName}
                      onChange={(event) => setEdit({ ...edit, displayName: event.target.value })} />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={busy} className={buttonPrimaryClass}>Save</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
