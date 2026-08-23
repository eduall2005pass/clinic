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
  type Notice,
} from "@/components/admin/admin-ui";

type Assignment = { email: string; role: string; permissions: string[] };

const ROLES = ["super-admin", "admin", "moderator"] as const;

export default function RolesPage() {
  const gate = useAdminGate();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/roles", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { assignments?: Assignment[] };
      setAssignments(data.assignments ?? []);
    } catch {
      setAssignments([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading roles…" />
    );
  }

  function update(index: number, patch: Partial<Assignment>) {
    setAssignments((prev) => (prev ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ assignments }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; assignments?: Assignment[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save roles." });
        return;
      }
      setAssignments(data?.assignments ?? []);
      setNotice({ kind: "success", text: "Role assignments saved." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(email: string) {
    setAssignments((prev) => (prev ?? []).filter((row) => row.email !== email));
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Roles</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Assign roles by admin email. super-admin manages admins and system; admin manages content; moderator manages reviews.
        </p>
      </header>

      <form
        className={`${cardClass} mt-5 flex flex-wrap gap-2 p-4`}
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = email.trim().toLowerCase();
          if (!normalized.includes("@")) return;
          setAssignments((prev) =>
            (prev ?? []).some((row) => row.email === normalized)
              ? prev
              : [...(prev ?? []), { email: normalized, role: "admin", permissions: ["manageContent"] }],
          );
          setEmail("");
        }}
      >
        <input className={`${inputClass} min-w-0 flex-1`} type="email" placeholder="admin@example.com"
          aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button type="submit" className={buttonPrimaryClass}>+ Add</button>
      </form>

      <div className="mt-4 space-y-3">
        {(assignments ?? []).map((assignment, index) => (
          <div key={assignment.email} className={`${cardClass} flex flex-wrap items-center gap-3 p-4`}>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
              {assignment.email}
            </span>
            <select
              value={assignment.role}
              onChange={(event) => update(index, { role: event.target.value })}
              aria-label={`Role for ${assignment.email}`}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold admin-dark:border-zinc-700 admin-dark:bg-zinc-800"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button type="button" onClick={() => void remove(assignment.email)} className={buttonSecondaryClass}>
              Remove
            </button>
          </div>
        ))}
        {(assignments ?? []).length === 0 && assignments !== null && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
            No role assignments yet — every admin defaults to full access.
          </p>
        )}
      </div>

      {(assignments ?? []).length > 0 && (
        <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonPrimaryClass} mt-5`}>
          {busy ? "Saving…" : "Save Roles"}
        </button>
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
