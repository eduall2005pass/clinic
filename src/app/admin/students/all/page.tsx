"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type {
  AdminStudent,
  StudentEnrollmentInfo,
} from "@/lib/students-admin";

type StatusFilter = "all" | "active" | "deactivated";

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];

function formatDate(value: number | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AllStudentsPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [students, setStudents] = useState<AdminStudent[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Detail panel
  const [detailUid, setDetailUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    student: AdminStudent;
    enrollments: StudentEnrollmentInfo[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Activation confirm
  const [confirmTarget, setConfirmTarget] = useState<{ student: AdminStudent; active: boolean } | null>(null);
  const [toggling, setToggling] = useState(false);

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

  const loadStudents = useCallback(
    async (searchTerm: string, status: StatusFilter) => {
      try {
        const token = user ? await user.getIdToken() : null;
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        params.set("status", status);
        const res = await fetch(`/api/admin/students?${params.toString()}`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { students?: AdminStudent[] };
        setStudents(data.students ?? []);
      } catch {
        setStudents([]);
      }
    },
    [user],
  );

  // Initial + filter loads
  useEffect(() => {
    if (adminStatus !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state updates happen asynchronously after fetch
    loadStudents(search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when filters change
  }, [adminStatus, statusFilter]);

  // Debounced search
  useEffect(() => {
    if (adminStatus !== "admin") return;
    const timer = setTimeout(() => {
      loadStudents(search, statusFilter);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search input debounce
  }, [search]);

  function openDetail(student: AdminStudent) {
    setDetailUid(student.uid);
    setDetail(null);
    setDetailLoading(true);
    user
      ?.getIdToken()
      .then((token) =>
        fetch(`/api/admin/students?uid=${encodeURIComponent(student.uid)}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { student?: AdminStudent; enrollments?: StudentEnrollmentInfo[] } | null) => {
        if (data?.student) {
          setDetail({ student: data.student, enrollments: data.enrollments ?? [] });
        }
      })
      .finally(() => setDetailLoading(false));
  }

  async function handleToggleActive(student: AdminStudent, active: boolean) {
    if (!user) return;
    setToggling(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/students", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: student.uid, isActive: active }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to update the account.");
        return;
      }
      toast.showToast("success", data.message ?? "Account updated.");
      setStudents((prev) =>
        prev
          ? prev.map((item) =>
              item.uid === student.uid ? { ...item, isActive: active } : item,
            )
          : prev,
      );
      if (detail?.student.uid === student.uid) {
        setDetail((prev) =>
          prev ? { ...prev, student: { ...prev.student, isActive: active } } : prev,
        );
      }
    } catch {
      toast.showToast("error", "Failed to update the account.");
    } finally {
      setToggling(false);
      setConfirmTarget(null);
    }
  }

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && students === null)) {
    return <AccessLoading label="Loading students…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Student management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 shadow-sm transition-colors duration-300 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2.5 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100";

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          All Students
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          View registered students, inspect details and enrollments, and
          manage account activation.
        </p>
      </header>

      {/* Search + filters */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, student ID, email or phone…"
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
        {students === null && (
          <li className={cardClass}>
            <p className="py-6 text-center text-sm font-semibold text-slate-500">Loading…</p>
          </li>
        )}
        {students?.length === 0 && (
          <li className={cardClass}>
            <p className="py-8 text-center text-sm font-semibold text-slate-500">
              No students found{search ? ` for “${search}”` : ""}.
            </p>
          </li>
        )}
        {students?.map((student) => (
          <li key={student.uid} className={cardClass}>
            <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-[#f1f5f9] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
                {student.profilePictureUrl ? (
                  <Image
                    src={student.profilePictureUrl}
                    alt={student.fullName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-extrabold text-slate-400">
                    {student.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => openDetail(student)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-bold text-[#0b1e3a] transition hover:text-[#1a3a78] admin-dark:text-zinc-100">
                  {student.fullName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {student.studentId}
                  {student.email ? ` · ${student.email}` : ""}
                </p>
              </button>

              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-slate-500">{student.hscBatch}</p>
                <p className="text-xs text-slate-400">
                  {student.enrollmentCount} enrollment{student.enrollmentCount === 1 ? "" : "s"}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  student.isActive
                    ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                    : "bg-red-500/10 text-red-500 admin-dark:text-red-400"
                }`}
              >
                {student.isActive ? "Active" : "Deactivated"}
              </span>

              <button
                type="button"
                onClick={() => openDetail(student)}
                className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/50 hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-zinc-300"
              >
                Details
              </button>
            </div>

            {/* Detail panel */}
            {detailUid === student.uid && (
              <div className="border-t border-neutral-100 p-4 sm:p-5 admin-dark:border-zinc-800">
                {detailLoading && (
                  <p className="py-3 text-center text-sm font-semibold text-slate-500">
                    Loading details…
                  </p>
                )}
                {!detailLoading && detail?.student.uid === student.uid && (
                  <>
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Student ID</dt>
                        <dd className="font-mono text-slate-700 admin-dark:text-zinc-200">{detail.student.studentId}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</dt>
                        <dd className="truncate text-slate-700 admin-dark:text-zinc-200">{detail.student.email || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</dt>
                        <dd className="text-slate-700 admin-dark:text-zinc-200">{detail.student.contactNumber || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Gender</dt>
                        <dd className="text-slate-700 admin-dark:text-zinc-200">{detail.student.gender || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Institution</dt>
                        <dd className="truncate text-slate-700 admin-dark:text-zinc-200">{detail.student.institution || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">HSC Batch</dt>
                        <dd className="text-slate-700 admin-dark:text-zinc-200">{detail.student.hscBatch || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Joined</dt>
                        <dd className="text-slate-700 admin-dark:text-zinc-200">{formatDate(detail.student.createdAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 sm:block">
                        <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Sign-in Method</dt>
                        <dd className="text-slate-700 admin-dark:text-zinc-200">{detail.student.provider}</dd>
                      </div>
                    </dl>

                    {/* Enrollments */}
                    <h4 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Enrollments ({detail.enrollments.length})
                    </h4>
                    {detail.enrollments.length === 0 ? (
                      <p className="mt-2 rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-slate-500 admin-dark:border-zinc-700">
                        No enrollments yet.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {detail.enrollments.map((enrollment) => (
                          <li
                            key={enrollment.courseId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8fbff] px-3 py-2 text-sm admin-dark:bg-[#132a4f]/60"
                          >
                            <span className="min-w-0 truncate font-semibold text-slate-700 admin-dark:text-zinc-200">
                              {enrollment.courseName}
                            </span>
                            <span className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-white px-2 py-0.5 font-bold uppercase admin-dark:bg-zinc-900">
                                {enrollment.courseKind}
                              </span>
                              <span>{formatDate(enrollment.enrolledAt)}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 font-bold ${
                                  enrollment.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                                    : "bg-zinc-200 text-slate-500 admin-dark:bg-zinc-700 admin-dark:text-zinc-300"
                                }`}
                              >
                                {enrollment.status}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Activation control */}
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4 admin-dark:border-zinc-800">
                      <p className="text-xs text-slate-500">
                        Deactivating blocks the student&apos;s access to enrolled content. Authentication credentials are never modified.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmTarget({
                            student: detail.student,
                            active: !detail.student.isActive,
                          })
                        }
                        disabled={toggling}
                        className={`ml-auto rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60 ${
                          detail.student.isActive
                            ? "bg-red-600 shadow-red-900/30 hover:bg-red-700"
                            : "bg-emerald-600 shadow-emerald-900/30 hover:bg-emerald-700"
                        }`}
                      >
                        {detail.student.isActive ? "Deactivate Account" : "Activate Account"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {notice && (
        <p
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      <AdminConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.active ? "Activate this account?" : "Deactivate this account?"}
        message={
          confirmTarget
            ? `${confirmTarget.student.fullName} (${confirmTarget.student.studentId}) will ${
                confirmTarget.active ? "regain access" : "lose access"
              } to enrolled content. Authentication credentials are not modified.`
            : ""
        }
        confirmLabel={confirmTarget?.active ? "Activate" : "Deactivate"}
        danger={!confirmTarget?.active}
        onConfirm={() => {
          if (confirmTarget) handleToggleActive(confirmTarget.student, confirmTarget.active);
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </section>
  );
}
