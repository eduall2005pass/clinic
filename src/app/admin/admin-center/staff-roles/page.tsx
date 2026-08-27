"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  hasAdminPermission,
  noticeClass,
  cardClass,
  inputClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Assignment = { email: string; role: string; permissions: string[] };

const ROLES = [
  { value: "super-admin", label: "Super Admin", description: "Full access to every Admin Panel control and system settings. Cannot be restricted." },
  { value: "admin", label: "Admin", description: "Broad access — permissions to be defined separately (flexible matrix)." },
  { value: "moderator", label: "Moderator", description: "Moderation access — permissions to be defined separately (flexible matrix)." },
  { value: "teacher", label: "Teacher", description: "Limited to 4 teaching controls only. No other panel access unless explicitly granted." },
] as const;

const PERMISSIONS = [
  { value: "manageContent", label: "Content (website, home, notifications)" },
  { value: "manageCourses", label: "Courses (courses, categories)" },
  { value: "manageExams", label: "Exams (legacy broad)" },
  { value: "manageStudents", label: "Students" },
  { value: "manageAdmins", label: "Administration (Admin Center, system)" },
  { value: "manageSystem", label: "System" },
  { value: "manageCourseContent", label: "Course Content Control" },
  { value: "managePublicExam", label: "Public Exam Control" },
  { value: "manageQa", label: "Q&A Answer" },
  { value: "manageResults", label: "Result Sheet / Result Control" },
] as const;

// Teacher defaults for display when matrix empty
const TEACHER_DEFAULT = ["manageCourseContent", "managePublicExam", "manageQa", "manageResults"];

export default function StaffRolesPage() {
  const gate = useAdminGate();
  const allowed = hasAdminPermission(gate, "manageAdmins");
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [matrix, setMatrix] = useState<Record<string, string[]> | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles", { cache: "no-store", headers: gate.headers });
      const data = (await res.json()) as { assignments?: Assignment[]; rolePermissions?: Record<string, string[]> };
      setAssignments(data.assignments ?? []);
      setMatrix(data.rolePermissions ?? {});
    } catch {
      setAssignments([]);
      setMatrix({});
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready && allowed) void load();
  }, [gate.ready, allowed, load]);

  if (!gate.ready) return <AccessLoading label="Loading Staff Roles…" />;
  if (!allowed) {
    return (
      <AccessMessage
        title="Staff Roles — Administration access required"
        message="Your role does not include permission to manage staff roles. Only Super Admin / Admin Center can manage roles."
        actionLabel="Back to Admin Center"
        actionHref="/admin/admin-center"
      />
    );
  }

  function update(index: number, patch: Partial<Assignment>) {
    setAssignments((prev) => (prev ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function togglePermission(role: string, permission: string) {
    if (role === "super-admin") return;
    setMatrix((prev) => {
      const current = prev?.[role] ?? (role === "teacher" ? [...TEACHER_DEFAULT] : []);
      const next = current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission];
      return { ...(prev ?? {}), [role]: next };
    });
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ assignments, rolePermissions: matrix }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; assignments?: Assignment[]; rolePermissions?: Record<string, string[]> } | null;
      if (!res.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save staff roles." });
        return;
      }
      setAssignments(data?.assignments ?? []);
      setMatrix(data?.rolePermissions ?? {});
      setNotice({ kind: "success", text: "Staff Roles saved — flexible permissions apply immediately to frontend and backend." });
    } finally {
      setBusy(false);
    }
  }

  function remove(emailToRemove: string) {
    setAssignments((prev) => (prev ?? []).filter((row) => row.email !== emailToRemove));
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/admin-center" className="text-sm font-semibold text-[#234e9f] hover:text-[#1a3a78] admin-dark:text-[#93c5fd]">
        ← Admin Center
      </Link>
      <header className="mt-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Staff Roles / Admin Roles</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Admin Center → Staff Roles. 4 role levels with a flexible, future-proof RBAC matrix. Each admin account has an assigned role enforced on both frontend and backend.
        </p>
      </header>

      {/* Role overview cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ROLES.map((role) => (
          <div key={role.value} id={role.value} className={`${cardClass} p-4 scroll-mt-6`}>
            <p className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">{role.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">{role.description}</p>
            {role.value === "teacher" && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Teacher permissions (current)</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(matrix?.teacher ?? TEACHER_DEFAULT).map((perm) => (
                    <span key={perm} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 admin-dark:border-emerald-500/20 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-400">
                      {perm.replace("manage", "")}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">Teacher has no access to other Admin Panel controls unless explicitly granted later.</p>
              </div>
            )}
            {role.value !== "teacher" && role.value !== "super-admin" && (
              <p className="mt-2 text-[11px] text-neutral-400">Permissions will be defined separately — edit the matrix below.</p>
            )}
            {role.value === "super-admin" && (
              <p className="mt-2 text-[11px] font-semibold text-[#234e9f] admin-dark:text-[#93c5fd]">Always has all permissions.</p>
            )}
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Flexible permission matrix</h3>
        <p className="mt-1 text-xs text-slate-500">Configure what each role may manage. Changes are enforced immediately on both UI and API.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Role</th>
                {PERMISSIONS.map((perm) => (
                  <th key={perm.value} className="px-2 pb-2 text-center text-[10px]" title={perm.label}>
                    {perm.value.replace("manage", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role.value} className="border-t border-neutral-100 admin-dark:border-zinc-800">
                  <td className="py-2 pr-4">
                    <span className="text-xs font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{role.label}</span>
                  </td>
                  {PERMISSIONS.map((perm) => {
                    const checked = role.value === "super-admin" || Boolean(matrix?.[role.value]?.includes(perm.value));
                    return (
                      <td key={perm.value} className="px-2 py-2 text-center" title={perm.label}>
                        <input
                          type="checkbox"
                          aria-label={`${role.label}: ${perm.label}`}
                          disabled={role.value === "super-admin"}
                          checked={checked}
                          onChange={() => togglePermission(role.value, perm.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500 admin-dark:text-slate-400">Super Admin always has every permission. Teacher defaults to Course Content, Public Exam, Q&A, Result — keep flexible so permissions can be changed later.</p>
      </div>

      {/* Email → role assignments */}
      <form
        className={`${cardClass} mt-4 flex flex-wrap gap-2 p-4`}
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = email.trim().toLowerCase();
          if (!normalized.includes("@")) return;
          setAssignments((prev) =>
            (prev ?? []).some((row) => row.email === normalized)
              ? prev
              : [...(prev ?? []), { email: normalized, role: "teacher", permissions: matrix?.["teacher"] ?? TEACHER_DEFAULT }],
          );
          setEmail("");
        }}
      >
        <input className={`${inputClass} min-w-0 flex-1`} type="email" placeholder="staff@example.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className={buttonPrimaryClass}>+ Add Staff</button>
      </form>

      <div className="mt-4 space-y-3">
        {(assignments ?? []).map((assignment, index) => (
          <div key={assignment.email} className={`${cardClass} flex flex-wrap items-center gap-3 p-4`}>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{assignment.email}</span>
            <select
              value={assignment.role}
              onChange={(event) => update(index, { role: event.target.value })}
              aria-label={`Role for ${assignment.email}`}
              className="rounded-xl border border-[#dbeafe] bg-white px-3 py-1.5 text-xs font-bold shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => void remove(assignment.email)} className={buttonSecondaryClass}>
              Remove
            </button>
          </div>
        ))}
        {(assignments ?? []).length === 0 && assignments !== null && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-slate-500 admin-dark:border-zinc-700">
            No staff assignments yet — admins without an assignment default to the Admin role.
          </p>
        )}
      </div>

      {((assignments ?? []).length > 0 || matrix !== null) && (
        <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonPrimaryClass} mt-5`}>
          {busy ? "Saving…" : "Save Staff Roles"}
        </button>
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
