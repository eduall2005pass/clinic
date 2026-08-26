"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

/**
 * Enrollment Control → Payment Card management.
 * Edits the MySQL-backed bKash/Nagad configuration students pay to.
 * Backend (PUT /api/admin/enrollment-control/payment-card) re-verifies
 * admin authorization and validates at least one active method.
 */

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

export default function PaymentCardPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [config, setConfig] = useState<PaymentCardConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
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
    })();
  }, [user]);

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

  if (authLoading) return <AccessLoading label="Loading…" />;
  if (!config) return <AccessLoading label="Loading payment card…" />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Payment Card</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage the bKash/Nagad numbers, coupon availability and payment
        instructions shown to students.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-5">
          {/* bKash */}
          <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-heading">bKash</h2>
              <Toggle on={config.bkashEnabled} onChange={() => toggle("bkashEnabled")} label="bKash" />
            </div>
            <div className="mt-4">
              <label className={labelClass} htmlFor="bkash-number">bKash Number</label>
              <input
                id="bkash-number"
                inputMode="tel"
                disabled={!config.bkashEnabled}
                className={`${inputClass} disabled:opacity-50`}
                placeholder="01XXXXXXXXX"
                value={config.bkashNumber}
                onChange={(event) => patch({ bkashNumber: event.target.value })}
              />
            </div>
          </div>

          {/* Nagad */}
          <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-heading">Nagad</h2>
              <Toggle on={config.nagadEnabled} onChange={() => toggle("nagadEnabled")} label="Nagad" />
            </div>
            <div className="mt-4">
              <label className={labelClass} htmlFor="nagad-number">Nagad Number</label>
              <input
                id="nagad-number"
                inputMode="tel"
                disabled={!config.nagadEnabled}
                className={`${inputClass} disabled:opacity-50`}
                placeholder="01XXXXXXXXX"
                value={config.nagadNumber}
                onChange={(event) => patch({ nagadNumber: event.target.value })}
              />
            </div>
          </div>

          {/* Coupon availability */}
          <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-heading">Coupon</h2>
              <Toggle
                on={config.couponEnabled}
                onChange={() => patch({ couponEnabled: !config.couponEnabled })}
                label="Coupon Availability"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-400">
              <span className="font-bold uppercase tracking-wider text-neutral-300">
                Coupon Availability:
              </span>{" "}
              {config.couponEnabled ? "ON — students see the coupon option." : "OFF — the coupon option is hidden from students. Existing coupons and their configuration are kept; turning it back ON restores them."}
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
                  value={config.instructions}
                  onChange={(event) => patch({ instructions: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pay-note">Extra Note (optional)</label>
                <textarea
                  id="pay-note"
                  className={`${inputClass} min-h-[60px]`}
                  value={config.note}
                  onChange={(event) => patch({ note: event.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
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
              {config.bkashEnabled && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-3">
                  <span className="text-sm font-extrabold text-pink-300">bKash</span>
                  <span className="truncate font-mono text-sm text-heading">
                    {config.bkashNumber || "—"}
                  </span>
                </div>
              )}
              {config.nagadEnabled && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                  <span className="text-sm font-extrabold text-orange-300">Nagad</span>
                  <span className="truncate font-mono text-sm text-heading">
                    {config.nagadNumber || "—"}
                  </span>
                </div>
              )}
              {!config.bkashEnabled && !config.nagadEnabled && (
                <p className="text-xs text-red-400">No payment method enabled.</p>
              )}
            </div>
            {/* Coupon option — mirrors the student card (hidden when OFF) */}
            {config.couponEnabled ? (
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
            {config.instructions && (
              <p className="mt-4 whitespace-pre-line text-xs leading-relaxed text-neutral-300">
                {config.instructions}
              </p>
            )}
            {config.note && (
              <p className="mt-3 whitespace-pre-line rounded-lg border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-3 py-2 text-[11px] text-neutral-400">
                {config.note}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
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
