"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type AdminAccount = {
  uid?: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  role: string;
  isActive: number | boolean;
  createdAt?: string | null;
};

type RoleAssignment = { email: string; role: string };

const ROLE_OPTIONS = ["admin", "content", "exams", "courses", "students", "viewer"];

export default function AdminCenterPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/admin/accounts", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { admins?: AdminAccount[] };
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
    } catch {
      setAdmins([]);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  async function addAdmin() {
    if (!user || !newEmail.trim()) {
      toast.showToast("error", "Admin email is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          displayName: newName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to add the admin.");
        return;
      }
      toast.showToast("success", "Admin added.");
      setNewEmail("");
      setNewName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(admin: AdminAccount, role: string) {
    if (!user) return;
    try {
      // Role assignment is stored per email via the roles API.
      const assignments: RoleAssignment[] = [{ email: admin.email, role }];
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ assignments }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to save the role.");
        return;
      }
      setAdmins((prev) =>
        (prev ?? []).map((item) =>
          item.email === admin.email ? { ...item, role } : item,
        ),
      );
      toast.showToast("success", `Role updated for ${admin.email}.`);
    } catch {
      toast.showToast("error", "Failed to save the role.");
    }
  }

  async function toggleActive(admin: AdminAccount) {
    if (!user) return;
    const nextActive = !(Number(admin.isActive) === 1);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ email: admin.email, isActive: nextActive }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update the admin.");
        return;
      }
      await load();
      toast.showToast(
        "success",
        `${admin.email} is now ${nextActive ? "active" : "inactive"}.`,
      );
    } catch {
      toast.showToast("error", "Failed to update the admin.");
    }
  }

  if (authLoading) {
    return <AccessLoading label="Loading Admin Center…" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Admin Center</h1>
      <p className="mt-1 text-sm text-neutral-400">
        All authorized admin accounts and their access / roles.
      </p>

      {/* Add admin */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Add New Admin</h2>
        <p className="mt-1 text-xs text-neutral-500">
          The Google account must have signed in at least once — only the
          authorization row is created here.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="admin@gmail.com"
            className="w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
          />
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Display name (optional)"
            className="w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
          />
          <button
            type="button"
            onClick={() => void addAdmin()}
            disabled={busy}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
          >
            Add Admin
          </button>
        </div>
      </div>

      {/* Admin list */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6">
        <h2 className="text-lg font-bold text-heading">
          All Admins ({admins?.length ?? 0})
        </h2>
        {admins === null ? (
          <AccessLoading label="Loading admins…" />
        ) : admins.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No admin accounts found.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {admins.map((admin) => (
              <li
                key={admin.email}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-dark-950/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">
                    {admin.displayName || admin.email}
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">{admin.email}</p>
                </div>
                <select
                  value={admin.role ?? "admin"}
                  onChange={(event) => void updateRole(admin, event.target.value)}
                  aria-label={`Role for ${admin.email}`}
                  className="rounded-lg border border-ink/15 bg-dark-850 px-2.5 py-1.5 text-xs font-semibold capitalize text-heading outline-none focus:border-primary-500/60"
                >
                  {(ROLE_OPTIONS.includes(admin.role)
                    ? ROLE_OPTIONS
                    : [admin.role, ...ROLE_OPTIONS]
                  ).map((role) => (
                    <option key={role} value={role} className="capitalize">
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void toggleActive(admin)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    Number(admin.isActive) === 1
                      ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {Number(admin.isActive) === 1 ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
