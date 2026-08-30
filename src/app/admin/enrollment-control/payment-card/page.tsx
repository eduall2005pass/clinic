"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { formatFee } from "@/lib/courses";
import type { AdminEnrollment } from "@/lib/enrollments-admin";

/**
 * Enrollment Control → Payment Card management.
 * Two tabs:
 *   - Settings: edit the MySQL-backed bKash/Nagad numbers, coupon availability
 *     and payment instructions shown to students (with a live preview).
 *   - Overview: the complete payment + enrollment record for every enrollment
 *     (student, course, original fee, discount/coupon, final payable, payment
 *     method, transaction reference, payment/enrollment dates, verification &
 *     enrollment status, approval/rejection audit) with full admin control.
 * Backend PUT /api/admin/enrollment-control/payment-card re-verifies admin
 * authorization and validates at least one active method.
 */

type Tab = "overview" | "settings";

type PaymentCardConfig = {
  bkashNumber: string;
  nagadNumber: string;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  couponEnabled: boolean;
  instructions: string;
  note: string;
};

const EMPTY: PaymentCardConfig = {
  bkashNumber: "",
  nagadNumber: "",
  bkashEnabled: true,
  nagadEnabled: false,
  couponEnabled: true,
  instructions: "",
  note: "",
};

const inputClass =
  "w-full rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-3 py-2 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce] focus:ring-2 focus:ring-primary-500/20";
const labelClass =
  "mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-400";

/** Generic optional form field. */
function Optional({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return "—";
  return <>{value}</>;
}

function formatDateTime(value: number | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PaymentCardPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [config, setConfig] = useState<PaymentCardConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Overview state
  const [enrollments, setEnrollments] = useState<AdminEnrollment[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active" | "cancelled" | "completed">("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminEnrollment | null>(null);

  const loadConfig = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/admin/enrollment-control/payment-card", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (res.ok) setConfig((await res.json()) as PaymentCardConfig);
      else setConfig({ ...EMPTY });
    } catch {
      setConfig({ ...EMPTY });
    }
  }, [user]);

  const loadEnrollments = useCallback(
    async (query = search, filter = statusFilter) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams();
        if (query.trim()) params.set("search", query.trim());
        if (filter !== "all") params.set("status", filter);
        const res = await fetch(`/api/admin/enrollments?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { enrollments?: AdminEnrollment[] };
        setEnrollments(Array.isArray(data.enrollments) ? data.enrollments : []);
      } catch {
        setEnrollments([]);
      }
    },
    [user, search, statusFilter],
  );

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConfig();
  }, [user, loadConfig]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEnrollments();
  }, [user, loadEnrollments]);

  function patch(fields: Partial<PaymentCardConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  function toggle(key: "bkashEnabled" | "nagadEnabled") {
    if (!config) return;
    // At least one method must stay enabled — mirror the backend rule.
    const other = key === "bkashEnabled" ? config.nagadEnabled : config.bkashEnabled;
    if (config[key] && !other) {
      toast.showToast("error", "At least one payment method must stay enabled.");
      return;
    }
    patch({ [key]: !config[key] } as Partial<PaymentCardConfig>);
  }

  async function save() {
    if (!config || saving || !user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/enrollment-control/payment-card", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify(config),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.showToast("error", data?.error ?? "Failed to save.");
        return;
      }
      toast.showToast("success", "Payment Card saved.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(
    enrollment: AdminEnrollment,
    update: { action: "accept" | "reject" } | { status: string },
  ) {
    if (!user) return;
    setBusyId(enrollment.id);
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
            ? { id: enrollment.id, action: update.action }
            : { id: enrollment.id, status: update.status },
        ),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update.");
        return;
      }
      toast.showToast(
        "success",
        "action" in update && update.action === "accept"
          ? `${enrollment.studentName || "Student"} accepted — enrollment is now ACTIVE and course access granted.`
          : "action" in update
            ? `${enrollment.studentName || "Application"} rejected.`
            : `Enrollment marked ${("status" in update ? update.status : "")}.`,
      );
      await loadEnrollments();
    } catch {
      toast.showToast("error", "Failed to update the enrollment.");
    } finally {
      setBusyId(null);
    }
  }
  if (authLoading) return <AccessLoading label="Loading…" />;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Payment Card</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage the payment methods shown to students, and review every payment +
        enrollment record.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")} label="Overview" />
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")} label="Settings" />
      </div>

      {tab === "overview" ? (
        <Overview
          enrollments={enrollments}
          loading={enrollments === null}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          busyId={busyId}
          rejectTarget={rejectTarget}
          setRejectTarget={setRejectTarget}
          onAccept={(e) => void setStatus(e, { action: "accept" })}
          onReject={() => {
            if (rejectTarget) void setStatus(rejectTarget, { action: "reject" });
          }}
          onRevoke={(e) => void setStatus(e, { status: "cancelled" })}
          onComplete={(e) => void setStatus(e, { status: "completed" })}
        />
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {/* Editor */}
          <div className="space-y-5">
            {/* bKash */}
            <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-heading">bKash</h2>
                <Toggle on={config?.bkashEnabled ?? false} onChange={() => toggle("bkashEnabled")} label="bKash" />
              </div>
              <div className="mt-4">
                <label className={labelClass} htmlFor="bkash-number">bKash Number</label>
                <input
                  id="bkash-number"
                  inputMode="tel"
                  disabled={!config?.bkashEnabled}
                  className={`${inputClass} disabled:opacity-50`}
                  placeholder="01XXXXXXXXX"
                  value={config?.bkashNumber ?? ""}
                  onChange={(event) => patch({ bkashNumber: event.target.value })}
                />
              </div>
            </div>

            {/* Nagad */}
            <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-heading">Nagad</h2>
                <Toggle on={config?.nagadEnabled ?? false} onChange={() => toggle("nagadEnabled")} label="Nagad" />
              </div>
              <div className="mt-4">
                <label className={labelClass} htmlFor="nagad-number">Nagad Number</label>
                <input
                  id="nagad-number"
                  inputMode="tel"
                  disabled={!config?.nagadEnabled}
                  className={`${inputClass} disabled:opacity-50`}
                  placeholder="01XXXXXXXXX"
                  value={config?.nagadNumber ?? ""}
                  onChange={(event) => patch({ nagadNumber: event.target.value })}
                />
              </div>
            </div>

            {/* Coupon availability */}
            <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-heading">Coupon</h2>
                <Toggle
                  on={config?.couponEnabled ?? false}
                  onChange={() => patch({ couponEnabled: !config?.couponEnabled })}
                  label="Coupon Availability"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                <span className="font-bold uppercase tracking-wider text-neutral-300">
                  Coupon Availability:
                </span>{" "}
                {config?.couponEnabled ? "ON — students see the coupon option." : "OFF — the coupon option is hidden from students. Existing coupons and their configuration are kept; turning it back ON restores them."}
              </p>
            </div>

            {/* Instructions & note */}
            <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
              <h2 className="text-lg font-bold text-heading">Instructions</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelClass} htmlFor="pay-instructions">Payment Instructions</label>
                  <textarea
                    id="pay-instructions"
                    className={`${inputClass} min-h-[90px]`}
                    placeholder="Send money to the number above, then submit your Transaction ID…"
                    value={config?.instructions ?? ""}
                    onChange={(event) => patch({ instructions: event.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pay-note">Extra Note (optional)</label>
                  <textarea
                    id="pay-note"
                    className={`${inputClass} min-h-[60px]`}
                    value={config?.note ?? ""}
                    onChange={(event) => patch({ note: event.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !config}
              className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving…" : "Save Payment Card"}
            </button>
          </div>

          {/* Live preview — exactly what students will see */}
          <div>
            <p className={labelClass}>Live Preview</p>
            <div className="sticky top-24 rounded-2xl border border-primary-600/30 bg-gradient-to-br from-dark-900 via-dark-950 to-black p-6 shadow-xl shadow-black/40">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-400">
                Payment Method
              </p>
              <div className="mt-4 space-y-3">
                {config?.bkashEnabled && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-3">
                    <span className="text-sm font-extrabold text-pink-300">bKash</span>
                    <span className="truncate font-mono text-sm text-heading">
                      {config.bkashNumber || "—"}
                    </span>
                  </div>
                )}
                {config?.nagadEnabled && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                    <span className="text-sm font-extrabold text-orange-300">Nagad</span>
                    <span className="truncate font-mono text-sm text-heading">
                      {config.nagadNumber || "—"}
                    </span>
                  </div>
                )}
                {(!config?.bkashEnabled && !config?.nagadEnabled) && (
                  <p className="text-xs text-red-400">No payment method enabled.</p>
                )}
              </div>
              {/* Coupon option — mirrors the student card (hidden when OFF) */}
              {config?.couponEnabled ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                  <span className="text-sm font-extrabold text-emerald-300">Have a coupon?</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-lg border border-ink/15 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-3 py-1 text-[11px] uppercase text-neutral-500">
                      Enter coupon
                    </span>
                    <span className="rounded-lg border border-primary-500/40 bg-primary-600/10 px-2.5 py-1 text-[11px] font-bold text-primary-300">
                      Apply
                    </span>
                  </span>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-4 py-2.5 text-[11px] text-neutral-500">
                  Coupon availability is OFF — students will not see the coupon option.
                </p>
              )}
              {config?.instructions && (
                <p className="mt-4 whitespace-pre-line text-xs leading-relaxed text-neutral-300">
                  {config.instructions}
                </p>
              )}
              {config?.note && (
                <p className="mt-3 whitespace-pre-line rounded-lg border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-3 py-2 text-[11px] text-neutral-400">
                  {config.note}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition ${
        active
          ? "border-primary-600 bg-primary-600/10 text-primary-600 admin-dark:text-primary-400"
          : "border-[#dbeafe] bg-white text-neutral-500 hover:border-primary-500/40 hover:text-heading admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]"
      }`}
    >
      {label}
    </button>
  );
}

const STATUS_TABS: Array<{ value: "all" | "pending" | "active" | "cancelled" | "completed"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400",
  pending: "bg-yellow-500/10 text-yellow-600 admin-dark:text-yellow-400",
  cancelled: "bg-red-500/10 text-red-500 admin-dark:text-red-400",
  completed: "bg-blue-500/10 text-blue-600 admin-dark:text-blue-400",
};

function Overview({
  enrollments,
  loading,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  busyId,
  rejectTarget,
  setRejectTarget,
  onAccept,
  onReject,
  onRevoke,
  onComplete,
}: {
  enrollments: AdminEnrollment[] | null;
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: "all" | "pending" | "active" | "cancelled" | "completed";
  setStatusFilter: (value: "all" | "pending" | "active" | "cancelled" | "completed") => void;
  busyId: number | null;
  rejectTarget: AdminEnrollment | null;
  setRejectTarget: (value: AdminEnrollment | null) => void;
  onAccept: (value: AdminEnrollment) => void;
  onReject: () => void;
  onRevoke: (value: AdminEnrollment) => void;
  onComplete: (value: AdminEnrollment) => void;
}) {
  return (
    <div className="mt-8">
      <p className="text-sm text-neutral-400">
        Complete payment + enrollment records for every course. Verify each paid
        enrollment against your bKash/Nagad statement, then accept or reject.
      </p>

      {/* Search + filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search student, ID, email or course…"
          className={`${inputClass} sm:max-w-sm`}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.value
                  ? "border-primary-600 bg-primary-600/10 text-primary-600 admin-dark:text-primary-400"
                  : "border-neutral-200 text-neutral-500 hover:border-primary-500/40 hover:text-heading admin-dark:border-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6">
          <AccessLoading label="Loading payment & enrollment records…" />
        </div>
      ) : enrollments && enrollments.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-10 text-center text-sm font-semibold text-neutral-500">
          No payment/enrollment records{search ? ` for “${search}”` : ""}.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(enrollments ?? []).map((enrollment) => (
            <EnrollmentCard
              key={enrollment.id}
              enrollment={enrollment}
              busy={busyId === enrollment.id}
              onAccept={onAccept}
              onReject={setRejectTarget}
              onRevoke={onRevoke}
              onComplete={onComplete}
            />
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
            <h2 className="text-lg font-bold text-heading">Reject this payment/enrollment?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              <span className="font-bold text-heading">
                {rejectTarget.studentName || rejectTarget.studentUid}
              </span>{" "}
              <span className="text-neutral-500">for</span>{" "}
              <span className="font-semibold text-neutral-200">
                {rejectTarget.courseName}
              </span>{" "}
              <span className="text-neutral-500">
                will be rejected. No course access will be granted.
              </span>
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
                onClick={onReject}
                disabled={busyId === rejectTarget.id}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-900/40 transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                {busyId === rejectTarget.id ? "Rejecting…" : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EnrollmentCard({
  enrollment,
  busy,
  onAccept,
  onReject,
  onRevoke,
  onComplete,
}: {
  enrollment: AdminEnrollment;
  busy: boolean;
  onAccept: (value: AdminEnrollment) => void;
  onReject: (value: AdminEnrollment) => void;
  onRevoke: (value: AdminEnrollment) => void;
  onComplete: (value: AdminEnrollment) => void;
}) {
  const originalFee = enrollment.originalFee;
  const payable = enrollment.paymentAmount ?? enrollment.fee;
  // Visible discount = original fee − final payable (built-in discount + coupon).
  const discount =
    originalFee != null && payable != null && payable < originalFee
      ? originalFee - payable
      : null;

  return (
    <li
      className={`rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-5 shadow-lg shadow-black/20 ${
        busy ? "opacity-70" : ""
      }`}
    >
      {/* Student + course + status */}
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-lg"
        >
          👨‍🎓
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-heading">
            {enrollment.studentName || enrollment.studentUid}
          </p>
          <p className="truncate text-[11px] text-neutral-500">
            {[enrollment.studentId, enrollment.studentEmail].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-neutral-200">
            {enrollment.courseName}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${
            STATUS_BADGE[enrollment.status] ??
            "border-ink/10 bg-ink/5 text-neutral-300"
          }`}
        >
          {enrollment.status}
        </span>
      </div>

      {/* Fee breakdown */}
      <div className="mt-4 grid gap-2 rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 p-3 text-xs sm:grid-cols-4">
        <InfoCell label="Original Fee" value={formatFee(originalFee ?? 0)} />
        <InfoCell
          label="Discount / Coupon"
          value={
            discount
              ? `− ${formatFee(discount)}${enrollment.couponCode ? ` · ${enrollment.couponCode}` : ""}`
              : enrollment.couponCode
                ? `Coupon ${enrollment.couponCode}`
                : "—"
          }
        />
        <InfoCell label="Final Payable" strong value={formatFee(payable ?? 0)} />
        <InfoCell
          label="Payment Method"
          value={enrollment.courseKind === "paid" ? "bKash / Nagad" : "Free"}
        />
      </div>

      {/* Payment reference */}
      <div className="mt-2 grid gap-2 rounded-xl border border-primary-600/20 bg-primary-600/5 p-3 text-xs sm:grid-cols-3">
        <InfoCell
          label="Transaction ID"
          value={<span className="truncate font-mono">{enrollment.paymentTransactionId || "—"}</span>}
        />
        <InfoCell label="Payment From (Sender)" value={enrollment.paymentSender || "—"} />
        <InfoCell label="Payment Date" value={formatDateTime(enrollment.paymentDate)} />
      </div>

      {/* Enrollment + verification status */}
      <div className="mt-2 grid gap-2 rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <InfoCell label="Enrollment Date" value={formatDateTime(enrollment.enrolledAt)} />
        <InfoCell
          label="Payment Verification"
          value={
            enrollment.status === "active"
              ? "Verified / Approved"
              : enrollment.status === "pending"
                ? "Pending Verification"
                : enrollment.status === "cancelled"
                  ? "Rejected / Cancelled"
                  : "Completed"
          }
        />
        <InfoCell label="Approved By / At" value={`${enrollment.approvedBy || "—"}\n${formatDateTime(enrollment.approvedAt)}`} />
        <InfoCell label="Rejected By / At" value={`${enrollment.rejectedBy || "—"}\n${formatDateTime(enrollment.rejectedAt)}`} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
        {enrollment.status !== "active" && enrollment.status !== "completed" && (
          <button
            type="button"
            onClick={() => onAccept(enrollment)}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/40 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Processing…" : "Accept / Approve"}
          </button>
        )}
        {enrollment.status === "pending" && (
          <button
            type="button"
            onClick={() => onReject(enrollment)}
            disabled={busy}
            className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/15 disabled:opacity-50"
          >
            Reject
          </button>
        )}
        {enrollment.status === "active" && (
          <>
            <button
              type="button"
              onClick={() => onRevoke(enrollment)}
              disabled={busy}
              className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-xs font-bold text-yellow-500 transition hover:bg-yellow-500/15 disabled:opacity-50"
            >
              Revoke Access
            </button>
            <button
              type="button"
              onClick={() => onComplete(enrollment)}
              disabled={busy}
              className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-2 text-xs font-bold text-blue-400 transition hover:bg-blue-500/15 disabled:opacity-50"
            >
              Mark Completed
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function InfoCell({
  label,
  value,
  strong,
}: {
  label: string;
  value: unknown;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-0.5 whitespace-pre-line leading-snug ${
          strong ? "font-extrabold text-primary-600 admin-dark:text-primary-400" : "font-semibold text-heading"
        }`}
      >
        <Optional value={value as string | number | null | undefined} />
      </p>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`Toggle ${label}`}
      onClick={onChange}
      className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition ${
        on ? "bg-emerald-500" : "bg-zinc-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          on ? "translate-x-8" : "translate-x-1"
        }`}
      />
    </button>
  );
}
