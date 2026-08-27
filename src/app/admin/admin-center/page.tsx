"use client";

import Link from "next/link";
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

// Staff Roles / Admin Roles — 3 levels (Admin holds all Super Admin controls)
const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "teacher", label: "Teacher" },
] as const;

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((role) => [role.value, role.label]),
);

// Permission summary for Staff Roles display
const ROLE_SUMMARY: Record<string, { description: string; permissions: string[] }> = {
  admin: {
    description: "Full access to all Admin Panel controls and system settings (previous Super Admin controls).",
    permissions: ["All permissions"],
  },
  moderator: {
    description: "Moderation-level access. Permissions to be defined separately.",
    permissions: ["Will be defined separately"],
  },
  teacher: {
    description: "Limited to teaching controls only. No other panel access unless explicitly granted.",
    permissions: [
      "Course Content Control",
      "Public Exam Control",
      "Q&A Answer",
      "Result Sheet / Result Control",
    ],
  },
};

export default function AdminCenterPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/accounts", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { admins?: AdminAccount[] };
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
    } catch {
      setAdmins([]);
      setLoadError(true);
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ uid: admin.uid, isActive: nextActive }),
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

      {/* Staff Roles — sub-section inside Admin Center (not a top-level menu) */}
      <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-heading">Staff Roles / Admin Roles</h2>
            <p className="mt-1 text-xs text-neutral-500">
              3 role levels — flexible permission matrix for future RBAC. Teacher is scoped to 4 controls.
            </p>
          </div>
          <Link
            href="/admin/admin-center/staff-roles"
            className="rounded-xl bg-[#1a3a78] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#123060] admin-dark:bg-[#234e9f] admin-dark:hover:bg-[#1a3a78]"
          >
            Manage Staff Roles →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map((role) => (
            <Link
              key={role.value}
              href={`/admin/admin-center/staff-roles#${role.value}`}
              className="rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 p-4 transition hover:border-[#93c5fd] hover:bg-white admin-dark:hover:bg-[#132a4f]"
            >
              <p className="text-sm font-extrabold text-heading">{role.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                {ROLE_SUMMARY[role.value].description}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {ROLE_SUMMARY[role.value].permissions.map((perm) => (
                  <li key={perm} className="rounded-full border border-[#dbeafe] bg-white px-2 py-0.5 text-[10px] font-bold text-[#1a3a78] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd]">
                    {perm}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-neutral-400">
          Each staff/admin account has an assigned role. Both frontend and backend enforce the role’s permissions.
        </p>
      </div>

      {/* Add admin */}
      <div className="mt-8 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
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
            className="w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
          />
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Display name (optional)"
            className="w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
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
      <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
        <h2 className="text-lg font-bold text-heading">
          All Admins ({admins?.length ?? 0})
        </h2>
        {admins === null ? (
          <AccessLoading label="Loading admins…" />
        ) : loadError ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
            <p className="text-sm text-red-400">Failed to load the admin list.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd]"
            >
              Retry
            </button>
          </div>
        ) : admins.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No admin accounts found.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {admins.map((admin) => (
              <li
                key={admin.email}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-4 py-3"
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
                  className="rounded-lg border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-2.5 py-1.5 text-xs font-semibold capitalize text-heading outline-none focus:border-[#2f6bce]/60"
                >
                  {(ROLE_OPTIONS.some((role) => role.value === admin.role)
                    ? ROLE_OPTIONS.map((role) => role.value)
                    : [admin.role ?? "admin", ...ROLE_OPTIONS.map((role) => role.value)]
                  ).map((role) => (
                    <option key={role} value={role} className="capitalize">
                      {ROLE_LABELS[role] ?? role}
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
