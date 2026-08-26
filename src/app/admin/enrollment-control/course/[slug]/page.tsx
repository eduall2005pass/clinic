"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type Application = {
  id: number;
  studentUid: string;
  studentName?: string;
  studentId?: string;
  studentEmail?: string;
  courseId: string;
  courseName: string;
  status: string;
  enrollmentDate?: string;
  /** Payment details — verified MANUALLY against the bKash/Nagad statement. */
  paymentTransactionId?: string | null;
  paymentAmount?: number | null;
  paymentSender?: string | null;
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function CourseApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { slug } = use(params);
  const { kind: rawKind } = use(searchParams);
  const kind = rawKind === "free" ? "free" : "paid";

  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  /** Application awaiting rejection confirmation. */
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    try {
      const authToken = await user.getIdToken();
      const query =
        filter === "pending"
          ? `course=${encodeURIComponent(slug)}&status=pending`
          : `course=${encodeURIComponent(slug)}`;
      const res = await fetch(`/api/admin/enrollments?${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { enrollments?: Application[] };
      setApplications(Array.isArray(data.enrollments) ? data.enrollments : []);
    } catch {
      setError(true);
    }
  }, [user, slug, filter]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  /**
   * Accept / reject go through the transactional action endpoints
   * (pending → active/cancelled with audit); other statuses stay legacy.
   */
  async function setStatus(
    application: Application,
    update: { action: "accept" | "reject" } | { status: string },
  ) {
    if (!user) return;
    setBusyId(application.id);
    try {
      const authToken = await user.getIdToken();
      const res = await fetch("/api/admin/enrollments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(
          "action" in update
            ? { id: application.id, action: update.action }
            : { id: application.id, status: update.status },
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update.");
        return;
      }
      toast.showToast(
        "success",
        "action" in update && update.action === "accept"
          ? `${application.studentName || "Student"} accepted — enrollment is now ACTIVE and course access granted.`
          : "action" in update
            ? `${application.studentName || "Application"} rejected.`
            : `Application marked ${update.status}.`,
      );
      // Refresh list — processed applications leave the pending view.
      await load();
    } catch {
      toast.showToast("error", "Failed to update the application.");
    } finally {
      setBusyId(null);
      setRejectTarget(null);
    }
  }

  if (authLoading) return <AccessLoading label="Loading applications…" />;

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href={`/admin/enrollment-control/${kind}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-400 transition hover:text-[#1a3a78]"
      >
        ← {kind === "free" ? "Free Course" : "Paid Course"} Enrollment
      </Link>

      <h1 className="mt-3 break-words text-2xl font-extrabold capitalize text-heading">
        Applications
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        Course-wise enrollment applications for this specific course. Verify
        each payment manually against your bKash/Nagad statement before
        accepting.
      </p>

      <div className="mt-5 flex gap-2">
        {(["pending", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              filter === value
                ? "border-primary-500/60 bg-primary-600/15 text-primary-300"
                : "border-ink/15 bg-ink/5 text-neutral-300 hover:border-primary-500/50 hover:text-heading"
            }`}
          >
            {value === "pending" ? "Pending Applications" : "All Applications"}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load applications.{" "}
          <button type="button" onClick={() => void load()} className="font-bold underline">
            Retry
          </button>
        </p>
      ) : applications === null ? (
        <AccessLoading label="Loading applicants…" />
      ) : applications.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-heading">
            No {filter === "pending" ? "pending " : ""}applications
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            {filter === "pending"
              ? "When a student applies for this course, their application appears here with a badge on the course card."
              : "No applications recorded for this course yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-5 shadow-lg shadow-black/20"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-lg"
                >
                  👨‍🎓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-heading">
                    {application.studentName || application.studentUid}
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    {[application.studentId, application.studentEmail]
                      .filter(Boolean)
                      .join(" · ") || application.studentUid}
                  </p>
                  {application.enrollmentDate ? (
                    <p className="mt-0.5 text-[11px] text-neutral-600">
                      Applied: {new Date(application.enrollmentDate).toLocaleDateString("en-GB")}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${
                    statusStyles[application.status] ??
                    "border-ink/10 bg-ink/5 text-neutral-300"
                  }`}
                >
                  {application.status}
                </span>
              </div>

              {/* Payment details for manual verification — admin checks
                  Transaction ID + Paid Amount + Sender Number against the
                  actual bKash/Nagad statement. No external auto-verification. */}
              {(application.paymentTransactionId ||
                (application.paymentAmount !== null &&
                  application.paymentAmount !== undefined) ||
                application.paymentSender) && (
                <dl className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 p-3 text-xs sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Transaction ID
                    </dt>
                    <dd className="mt-0.5 truncate font-mono font-semibold text-heading">
                      {application.paymentTransactionId || "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Paid Amount
                    </dt>
                    <dd className="mt-0.5 truncate font-mono font-semibold text-heading">
                      {application.paymentAmount != null
                        ? `৳ ${application.paymentAmount}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Sender Mobile
                    </dt>
                    <dd className="mt-0.5 truncate font-mono font-semibold text-heading">
                      {application.paymentSender || "—"}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                {application.status !== "active" && (
                  <button
                    type="button"
                    onClick={() =>
                      void setStatus(application, { action: "accept" })
                    }
                    disabled={busyId === application.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/40 transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busyId === application.id ? "Processing…" : "Accept Enrollment"}
                  </button>
                )}
                {application.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => setRejectTarget(application)}
                    disabled={busyId === application.id}
                    className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/15 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                {application.status === "active" && (
                  <button
                    type="button"
                    onClick={() =>
                      void setStatus(application, { status: "cancelled" })
                    }
                    disabled={busyId === application.id}
                    className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-xs font-bold text-yellow-400 transition hover:bg-yellow-500/15 disabled:opacity-50"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Reject confirmation */}
      {rejectTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm rejection"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-heading">Reject this application?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              <span className="font-bold text-heading">
                {rejectTarget.studentName || rejectTarget.studentUid}
              </span>{" "}
              will be rejected for{" "}
              <span className="font-semibold text-neutral-200">
                {rejectTarget.courseName}
              </span>
              . No course access will be granted and the application will be
              removed from Pending Applications.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={busyId === rejectTarget.id}
                className="rounded-xl border border-ink/20 px-5 py-2.5 text-sm font-bold text-neutral-300 transition hover:border-ink/40 hover:text-heading disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void setStatus(rejectTarget, { action: "reject" })}
                disabled={busyId === rejectTarget.id}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-900/40 transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                {busyId === rejectTarget.id ? "Rejecting…" : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
