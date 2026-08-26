"use client";

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
  { value: "super-admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "content-manager", label: "Content Manager" },
  { value: "course-manager", label: "Course Manager" },
  { value: "exam-manager", label: "Exam Manager" },
] as const;

const PERMISSIONS = [
  { value: "manageContent", label: "Content (notifications, jerseys, media, website)" },
  { value: "manageCourses", label: "Courses (courses, chapters, classes, coupons, enrollments)" },
  { value: "manageExams", label: "Exams (exams, questions, results, settings)" },
  { value: "manageStudents", label: "Students (student management)" },
  { value: "manageAdmins", label: "Administration (admins, roles, security, system)" },
] as const;

const DEFAULT_ROLE = "admin";

export default function RolesPage() {
  const gate = useAdminGate();
  const allowed = hasAdminPermission(gate, "manageAdmins");
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [matrix, setMatrix] = useState<Record<string, string[]> | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/roles", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as {
        assignments?: Assignment[];
        rolePermissions?: Record<string, string[]>;
      };
      setAssignments(data.assignments ?? []);
      setMatrix(data.rolePermissions ?? {});
    } catch {
      setAssignments([]);
      setMatrix({});
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready && allowed) void Promise.resolve().then(load);
  }, [gate.ready, allowed, load]);

  if (!gate.ready) {
    return (
      <AccessLoading label="Loading roles…" />
    );
  }
  if (!allowed) {
    return (
      <AccessMessage
        title="Super Admin / Administration access required"
        message="Your role does not include permission to manage roles and permissions."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  function update(index: number, patch: Partial<Assignment>) {
    setAssignments((prev) => (prev ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function togglePermission(role: string, permission: string) {
    if (role === "super-admin") return; // super-admin always has everything.
    setMatrix((prev) => {
      const current = prev?.[role] ?? [];
      const next = current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission];
      return { ...(prev ?? {}), [role]: next };
    });
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ assignments, rolePermissions: matrix }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        assignments?: Assignment[];
        rolePermissions?: Record<string, string[]>;
      } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save roles." });
        return;
      }
      setAssignments(data?.assignments ?? []);
      setMatrix(data?.rolePermissions ?? {});
      setNotice({ kind: "success", text: "Roles and permissions saved — changes apply immediately." });
    } finally {
      setBusy(false);
    }
  }

  function remove(email: string) {
    setAssignments((prev) => (prev ?? []).filter((row) => row.email !== email));
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Roles &amp; Permissions</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">
          Assign a role to each admin by email and configure what each role may manage. Permission changes are enforced on the server immediately.
        </p>
      </header>

      {/* Role permission matrix */}
      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Role permissions</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Role</th>
                {PERMISSIONS.map((permission) => (
                  <th key={permission.value} className="px-2 pb-2 text-center">{permission.value.replace("manage", "")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role.value} className="border-t border-neutral-100 admin-dark:border-zinc-800">
                  <td className="py-2 pr-4">
                    <span className="text-xs font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{role.label}</span>
                  </td>
                  {PERMISSIONS.map((permission) => {
                    const checked =
                      role.value === "super-admin" ||
                      Boolean(matrix?.[role.value]?.includes(permission.value));
                    return (
                      <td key={permission.value} className="px-2 py-2 text-center" title={permission.label}>
                        <input
                          type="checkbox"
                          aria-label={`${role.label}: ${permission.label}`}
                          disabled={role.value === "super-admin"}
                          checked={checked}
                          onChange={() => togglePermission(role.value, permission.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500 admin-dark:text-slate-400">Super Admin always has every permission.</p>
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
              : [...(prev ?? []), { email: normalized, role: DEFAULT_ROLE, permissions: matrix?.[DEFAULT_ROLE] ?? [] }],
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
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">
              {assignment.email}
            </span>
            <select
              value={assignment.role}
              onChange={(event) => update(index, { role: event.target.value })}
              aria-label={`Role for ${assignment.email}`}
              className="rounded-xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 px-3 py-1.5 text-xs font-bold admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => void remove(assignment.email)} className={buttonSecondaryClass}>
              Remove
            </button>
          </div>
        ))}
        {(assignments ?? []).length === 0 && assignments !== null && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs font-semibold text-slate-500 admin-dark:border-zinc-700">
            No role assignments yet — admins without an assignment default to the Admin role.
          </p>
        )}
      </div>

      {((assignments ?? []).length > 0 || matrix !== null) && (
        <button type="button" onClick={() => void save()} disabled={busy} className={`${buttonPrimaryClass} mt-5`}>
          {busy ? "Saving…" : "Save Changes"}
        </button>
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
