"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  hasAdminPermission,
  cardClass,
} from "@/components/admin/admin-ui";
import { AVAILABLE_ROLES, ROLE_LABELS } from "@/lib/administration";

type AdminAccount = {
  uid?: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  role: string;
  isActive: number | boolean;
  createdAt?: string | null;
};

type RoleParam = (typeof AVAILABLE_ROLES)[number];

export default function StaffByRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const gate = useAdminGate();
  const allowed = hasAdminPermission(gate, "manageAdmins");
  const { user, authLoading } = useAuth();
  const [staff, setStaff] = useState<AdminAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [role, setRole] = useState<RoleParam>("admin");
  const [selectedRoleLabel, setSelectedRoleLabel] = useState("Admin");

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
      const allAdmins = Array.isArray(data.admins) ? data.admins : [];
      const filtered = allAdmins.filter(
        (admin) => (admin.role ?? "admin").toLowerCase() === role,
      );
      setStaff(filtered);
    } catch {
      setStaff([]);
      setLoadError(true);
    }
  }, [user, role]);

  useEffect(() => {
    if (authLoading || !user) return;
    const resolvedParams = params;
    resolvedParams.then((p) => {
      const r = p.role.toLowerCase() as RoleParam;
      if (AVAILABLE_ROLES.includes(r)) {
        setRole(r);
        setSelectedRoleLabel(ROLE_LABELS[r] ?? r);
      } else {
        setRole("admin");
        setSelectedRoleLabel("Admin");
      }
      void load();
    });
  }, [authLoading, user, params, load]);

  if (!gate.ready) return <AccessLoading label="Loading Staff Profiles…" />;
  if (!allowed) {
    return (
      <AccessMessage
        title="Staff Profiles — Administration access required"
        message="Your role does not include permission to view staff profiles. Only Admin / Admin Center can access this."
        actionLabel="Back to Admin Center"
        actionHref="/admin/admin-center"
      />
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Staff Profiles — {selectedRoleLabel}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            All staff members assigned to the {selectedRoleLabel} level.
          </p>
        </div>
        <Link
          href="/admin/admin-center"
          className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 admin-dark:bg-[#1e3a65] admin-dark:text-white admin-dark:hover:bg-[#234e9f] transition"
        >
          ← Back to Admin Center
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Failed to load staff profiles.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd]"
          >
            Retry
          </button>
        </div>
      ) : staff === null ? (
        <AccessLoading label="Loading staff profiles…" />
      ) : staff.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="text-sm text-neutral-500">No staff members assigned to {selectedRoleLabel} level.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {staff.map((member) => (
            <li
              key={member.email}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] px-4 py-3"
            >
              {member.photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.photoUrl}
                    alt={member.displayName || member.email}
                    className="h-11 w-11 shrink-0 rounded-full object-cover shadow-md"
                  />
                </>
              ) : (
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-md ${
                    role === "admin"
                      ? "bg-purple-500"
                      : role === "moderator"
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  }`}
                >
                  {(member.displayName || member.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">
                  {member.displayName || member.email}
                </p>
                <p className="truncate text-[11px] text-neutral-500">
                  {member.email}
                  {member.uid && ` · UID: ${member.uid.slice(0, 8)}…`}
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${
                  role === "admin"
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                    : role === "moderator"
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {selectedRoleLabel}
              </span>
              <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                Number(member.isActive) === 1
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}>
                {Number(member.isActive) === 1 ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}