"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { getPublicCourses, getPayableFee, formatFee } from "@/lib/courses";
import type { AdminEnrollment } from "@/lib/enrollments-admin";

type StatusFilter = "all" | "pending" | "active" | "cancelled" | "completed";

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

const STATUS_BADGE: Record<string, string> = {
  active:
    "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400",
  pending:
    "bg-yellow-500/10 text-yellow-600 admin-dark:text-yellow-400",
  cancelled:
    "bg-red-500/10 text-red-500 admin-dark:text-red-400",
  completed:
    "bg-blue-500/10 text-blue-600 admin-dark:text-blue-400",
};

function formatDate(value: number | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StudentEnrollmentsPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");

  const [enrollments, setEnrollments] = useState<AdminEnrollment[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Assign course form
  const [students, setStudents] = useState<
    Array<{ uid: string; label: string }>
  >([]);
  const [assignStudentUid, setAssignStudentUid] = useState("");
  const [assignCourseId, setAssignCourseId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<AdminEnrollment | null>(null);

  const courseOptions = useMemo(() => getPublicCourses(), []);

  // Admin check
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!cancelled) setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const loadEnrollments = useCallback(
    async (searchTerm: string, status: StatusFilter) => {
      try {
        const token = user ? await user.getIdToken() : null;
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        params.set("status", status);
        const res = await fetch(`/api/admin/enrollments?${params.toString()}`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { enrollments?: AdminEnrollment[] };
        setEnrollments(data.enrollments ?? []);
      } catch {
        setEnrollments([]);
      }
    },
    [user],
  );

  // Initial + filter loads
  useEffect(() => {
    if (adminStatus !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state updates happen asynchronously after fetch
    loadEnrollments(search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when filters change
  }, [adminStatus, statusFilter]);

  // Debounced search
  useEffect(() => {
    if (adminStatus !== "admin") return;
    const timer = setTimeout(() => {
      loadEnrollments(search, statusFilter);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search input debounce
  }, [search]);

  // Load students once for the assign-course dropdown
  useEffect(() => {
    if (adminStatus !== "admin" || !user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin/students?status=active", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { students?: Array<{ uid: string; fullName: string; studentId: string }> } | null) => {
        if (cancelled || !data?.students) return;
        setStudents(
          data.students.map((student) => ({
            uid: student.uid,
            label: `${student.fullName} (${student.studentId})`,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user]);

  async function handleSetStatus(
    enrollment: AdminEnrollment,
    status: "active" | "cancelled",
  ) {
    if (!user) return;
    setBusyId(enrollment.id);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/enrollments", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: enrollment.id, status }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to update the enrollment.");
        return;
      }
      toast.showToast("success", data.message ?? "Enrollment updated.");
      setEnrollments((prev) =>
        prev
          ? prev.map((item) =>
              item.id === enrollment.id ? { ...item, status } : item,
            )
          : prev,
      );
    } catch {
      toast.showToast("error", "Failed to update the enrollment.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(enrollment: AdminEnrollment) {
    if (!user) return;
    setBusyId(enrollment.id);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/admin/enrollments?id=${enrollment.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to remove the enrollment.");
        return;
      }
      toast.showToast("success", data.message ?? "Course access removed.");
      setEnrollments((prev) =>
        prev ? prev.filter((item) => item.id !== enrollment.id) : prev,
      );
    } catch {
      toast.showToast("error", "Failed to remove the enrollment.");
    } finally {
      setBusyId(null);
      setRemoveTarget(null);
    }
  }

  async function handleAssign() {
    if (!user || !assignStudentUid || !assignCourseId) return;
    setAssigning(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentUid: assignStudentUid,
          courseId: assignCourseId,
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to assign the course.");
        return;
      }
      toast.showToast("success", data.message ?? "Course assigned.");
      setAssignStudentUid("");
      setAssignCourseId("");
      loadEnrollments(search, statusFilter);
    } catch {
      toast.showToast("error", "Failed to assign the course.");
    } finally {
      setAssigning(false);
    }
  }

  if (
    authLoading ||
    adminStatus === "checking" ||
    (adminStatus === "admin" && enrollments === null)
  ) {
    return <AccessLoading label="Loading enrollments…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Enrollment management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 shadow-sm transition-colors duration-300 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2.5 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100";
  const buttonClass =
    "rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Enrollments
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Review enrollment requests, approve or cancel them, assign courses
          manually and remove course access.
        </p>
      </header>

      {/* Assign course */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
          Assign a Course
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={assignStudentUid}
            onChange={(event) => setAssignStudentUid(event.target.value)}
            className={inputClass}
            aria-label="Student"
          >
            <option value="">Select student…</option>
            {students.map((student) => (
              <option key={student.uid} value={student.uid}>
                {student.label}
              </option>
            ))}
          </select>
          <select
            value={assignCourseId}
            onChange={(event) => setAssignCourseId(event.target.value)}
            className={inputClass}
            aria-label="Course"
          >
            <option value="">Select course…</option>
            {courseOptions.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.name} — {formatFee(getPayableFee(course))}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={assigning || !assignStudentUid || !assignCourseId}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning ? "Assigning…" : "Assign"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Assigning activates the course immediately for the selected student.
        </p>
      </div>

      {/* Search + filters */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by student name, ID, email or course…"
          className={inputClass}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.value
                  ? "border-primary-600 bg-primary-600/10 text-primary-600 admin-dark:text-primary-400"
                  : "border-neutral-200 text-slate-500 hover:border-primary-500/40 hover:text-slate-700 admin-dark:border-zinc-700 admin-dark:text-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ul className="mt-6 space-y-3">
        {enrollments?.length === 0 && (
          <li className={cardClass}>
            <p className="py-8 text-center text-sm font-semibold text-slate-500">
              No enrollments found{search ? ` for “${search}”` : ""}.
            </p>
          </li>
        )}
        {enrollments?.map((enrollment) => (
          <li key={enrollment.id} className={cardClass}>
            <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">
                  {enrollment.courseName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {enrollment.studentName} · {enrollment.studentId}
                  {enrollment.studentEmail ? ` · ${enrollment.studentEmail}` : ""}
                </p>
              </div>

              <span className="hidden rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500 sm:inline admin-dark:bg-zinc-900 admin-dark:text-zinc-300">
                {enrollment.courseType}
              </span>
              <span className="hidden text-xs font-semibold text-slate-500 md:inline">
                {enrollment.fee > 0 ? formatFee(enrollment.fee) : "Free"}
              </span>
              <span className="hidden text-xs text-slate-400 lg:inline">
                {formatDate(enrollment.enrolledAt)}
              </span>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                  STATUS_BADGE[enrollment.status] ??
                  "bg-zinc-200 text-slate-500 admin-dark:bg-zinc-700 admin-dark:text-zinc-300"
                }`}
              >
                {enrollment.status}
              </span>

              <span className="flex shrink-0 gap-2">
                {enrollment.status !== "active" && enrollment.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus(enrollment, "active")}
                    disabled={busyId === enrollment.id}
                    className={`${buttonClass} bg-emerald-600 text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-700`}
                  >
                    Approve
                  </button>
                )}
                {enrollment.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus(enrollment, "cancelled")}
                    disabled={busyId === enrollment.id}
                    className={`${buttonClass} border border-neutral-200 text-zinc-600 hover:border-red-500/60 hover:text-red-500 admin-dark:border-zinc-700 admin-dark:text-zinc-300`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRemoveTarget(enrollment)}
                  disabled={busyId === enrollment.id}
                  aria-label={`Remove access to ${enrollment.courseName}`}
                  className={`${buttonClass} border border-neutral-200 text-red-500 hover:border-red-500/60 hover:bg-red-500/10 admin-dark:border-zinc-700`}
                >
                  ✕
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <AdminConfirmDialog
        open={removeTarget !== null}
        title="Remove this course access?"
        message={
          removeTarget
            ? `${removeTarget.studentName} will permanently lose access to “${removeTarget.courseName}”. This cannot be undone — use Cancel instead to keep the record.`
            : ""
        }
        confirmLabel="Remove Access"
        danger
        onConfirm={() => {
          if (removeTarget) handleRemove(removeTarget);
        }}
        onClose={() => setRemoveTarget(null)}
      />
    </section>
  );
}
