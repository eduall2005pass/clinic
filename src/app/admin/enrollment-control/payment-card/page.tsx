"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  PaymentCardConfig,
  DEFAULT_PAYMENT_CARD,
  PAYMENT_CARD_MAX,
} from "@/lib/payment-card-config";

/**
 * Enrollment Control → Payment Card management.
 * Single-page editor with:
 *   Left:  per-element toggle + edit controls
 *   Right: live preview that exactly matches the student-facing payment card.
 *
 * No separate overview/settings tabs — everything is visual and direct.
 * Backend PUT /api/admin/enrollment-control/payment-card re-verifies admin
 * authorization and validates at least one active method.
 */

const inputClass =
  "w-full rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-3 py-2 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce] focus:ring-2 focus:ring-primary-500/20";
const labelClass =
  "mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-400";

export default function PaymentCardPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [config, setConfig] = useState<PaymentCardConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/admin/enrollment-control/payment-card", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (res.ok) setConfig((await res.json()) as PaymentCardConfig);
      else setConfig({ ...DEFAULT_PAYMENT_CARD });
    } catch {
      setConfig({ ...DEFAULT_PAYMENT_CARD });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConfig();
  }, [user, loadConfig]);

  function patch(fields: Partial<PaymentCardConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  function toggleMethod(key: "bkashEnabled" | "nagadEnabled") {
    if (!config) return;
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Payment Card</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Edit every element of the student payment card. The preview updates live.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ─── Editor (left) ─── */}
        <div className="space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
          {/* bKash */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">bKash</h2>
              <Toggle
                on={config?.bkashEnabled ?? false}
                onChange={() => toggleMethod("bkashEnabled")}
                label="bKash"
              />
            </div>
            {config?.bkashEnabled && (
              <div className="mt-3">
                <label className={labelClass} htmlFor="bkash-number">bKash Number</label>
                <input
                  id="bkash-number"
                  inputMode="tel"
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                  maxLength={PAYMENT_CARD_MAX.bkashNumber}
                  value={config?.bkashNumber ?? ""}
                  onChange={(e) => patch({ bkashNumber: e.target.value })}
                />
              </div>
            )}
            {config?.bkashEnabled && (
              <div className="mt-2">
                <label className={labelClass} htmlFor="bkash-label">Label</label>
                <input
                  id="bkash-label"
                  className={inputClass}
                  maxLength={PAYMENT_CARD_MAX.bkashLabel}
                  value={config?.bkashLabel ?? "bKash"}
                  onChange={(e) => patch({ bkashLabel: e.target.value })}
                />
              </div>
            )}
          </Section>

          {/* Nagad */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Nagad</h2>
              <Toggle
                on={config?.nagadEnabled ?? false}
                onChange={() => toggleMethod("nagadEnabled")}
                label="Nagad"
              />
            </div>
            {config?.nagadEnabled && (
              <div className="mt-3">
                <label className={labelClass} htmlFor="nagad-number">Nagad Number</label>
                <input
                  id="nagad-number"
                  inputMode="tel"
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                  maxLength={PAYMENT_CARD_MAX.nagadNumber}
                  value={config?.nagadNumber ?? ""}
                  onChange={(e) => patch({ nagadNumber: e.target.value })}
                />
              </div>
            )}
            {config?.nagadEnabled && (
              <div className="mt-2">
                <label className={labelClass} htmlFor="nagad-label">Label</label>
                <input
                  id="nagad-label"
                  className={inputClass}
                  maxLength={PAYMENT_CARD_MAX.nagadLabel}
                  value={config?.nagadLabel ?? "Nagad"}
                  onChange={(e) => patch({ nagadLabel: e.target.value })}
                />
              </div>
            )}
          </Section>

          {/* Course Fee / Discount */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Course Fee / Discount</h2>
              <Toggle
                on={config?.feeEnabled ?? true}
                onChange={() => patch({ feeEnabled: !config?.feeEnabled })}
                label="Fee Breakdown"
              />
            </div>
            {config?.feeEnabled && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="fee-label">Fee Label</label>
                  <input
                    id="fee-label"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.feeLabel}
                    value={config?.feeLabel ?? "Course Fee"}
                    onChange={(e) => patch({ feeLabel: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="discount-label">Discount Label</label>
                  <input
                    id="discount-label"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.discountLabel}
                    value={config?.discountLabel ?? "Discount"}
                    onChange={(e) => patch({ discountLabel: e.target.value })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Coupon */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Coupon</h2>
              <Toggle
                on={config?.couponEnabled ?? true}
                onChange={() => patch({ couponEnabled: !config?.couponEnabled })}
                label="Coupon Availability"
              />
            </div>
            {config?.couponEnabled && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="coupon-placeholder">Placeholder</label>
                  <input
                    id="coupon-placeholder"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.couponPlaceholder}
                    value={config?.couponPlaceholder ?? "COUPON CODE"}
                    onChange={(e) => patch({ couponPlaceholder: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="apply-label">Apply Button</label>
                  <input
                    id="apply-label"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.applyLabel}
                    value={config?.applyLabel ?? "Apply"}
                    onChange={(e) => patch({ applyLabel: e.target.value })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Payable Amount */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Payable Amount</h2>
              <Toggle
                on={config?.payableEnabled ?? true}
                onChange={() => patch({ payableEnabled: !config?.payableEnabled })}
                label="Payable Amount"
              />
            </div>
            {config?.payableEnabled && (
              <div className="mt-3">
                <label className={labelClass} htmlFor="payable-label">Label</label>
                <input
                  id="payable-label"
                  className={inputClass}
                  maxLength={PAYMENT_CARD_MAX.payableLabel}
                  value={config?.payableLabel ?? "Payable Amount"}
                  onChange={(e) => patch({ payableLabel: e.target.value })}
                />
              </div>
            )}
          </Section>

          {/* Payment Methods Label */}
          <Section>
            <div className="mt-1">
              <label className={labelClass} htmlFor="methods-label">Methods Section Label</label>
              <input
                id="methods-label"
                className={inputClass}
                maxLength={PAYMENT_CARD_MAX.methodsLabel}
                value={config?.methodsLabel ?? "Payment Methods"}
                onChange={(e) => patch({ methodsLabel: e.target.value })}
              />
            </div>
          </Section>

          {/* Instructions */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Payment Instructions</h2>
              <Toggle
                on={config?.instructionsEnabled ?? true}
                onChange={() => patch({ instructionsEnabled: !config?.instructionsEnabled })}
                label="Instructions"
              />
            </div>
            {config?.instructionsEnabled && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelClass} htmlFor="pay-instructions">Instructions</label>
                  <textarea
                    id="pay-instructions"
                    className={`${inputClass} min-h-[80px]`}
                    placeholder="Send money to the number above, then submit your Transaction ID…"
                    maxLength={PAYMENT_CARD_MAX.instructions}
                    value={config?.instructions ?? ""}
                    onChange={(e) => patch({ instructions: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pay-note">Extra Note (optional)</label>
                  <textarea
                    id="pay-note"
                    className={`${inputClass} min-h-[60px]`}
                    maxLength={PAYMENT_CARD_MAX.note}
                    value={config?.note ?? ""}
                    onChange={(e) => patch({ note: e.target.value })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Transaction ID */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Transaction ID Field</h2>
              <Toggle
                on={config?.txEnabled ?? true}
                onChange={() => patch({ txEnabled: !config?.txEnabled })}
                label="Transaction ID"
              />
            </div>
            {config?.txEnabled && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="tx-label">Label</label>
                  <input
                    id="tx-label"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.txLabel}
                    value={config?.txLabel ?? "Transaction ID"}
                    onChange={(e) => patch({ txLabel: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="tx-placeholder">Placeholder</label>
                  <input
                    id="tx-placeholder"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.txPlaceholder}
                    value={config?.txPlaceholder ?? "e.g. 8N7DQK2XLM"}
                    onChange={(e) => patch({ txPlaceholder: e.target.value })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Payment From Number */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Payment From Number</h2>
              <Toggle
                on={config?.senderEnabled ?? true}
                onChange={() => patch({ senderEnabled: !config?.senderEnabled })}
                label="Payment From Number"
              />
            </div>
            {config?.senderEnabled && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="sender-label">Label</label>
                  <input
                    id="sender-label"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.senderLabel}
                    value={config?.senderLabel ?? "Payment From Number"}
                    onChange={(e) => patch({ senderLabel: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="sender-placeholder">Placeholder</label>
                  <input
                    id="sender-placeholder"
                    className={inputClass}
                    maxLength={PAYMENT_CARD_MAX.senderPlaceholder}
                    value={config?.senderPlaceholder ?? "01XXXXXXXXX"}
                    onChange={(e) => patch({ senderPlaceholder: e.target.value })}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Pending Note */}
          <Section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold text-heading">Pending Validation Note</h2>
              <Toggle
                on={config?.pendingNoteEnabled ?? true}
                onChange={() => patch({ pendingNoteEnabled: !config?.pendingNoteEnabled })}
                label="Pending Note"
              />
            </div>
            {config?.pendingNoteEnabled && (
              <div className="mt-3">
                <label className={labelClass} htmlFor="pending-note">Note Text</label>
                <textarea
                  id="pending-note"
                  className={`${inputClass} min-h-[60px]`}
                  maxLength={PAYMENT_CARD_MAX.pendingNote}
                  value={config?.pendingNote ?? ""}
                  onChange={(e) => patch({ pendingNote: e.target.value })}
                />
              </div>
            )}
          </Section>

          {/* Buttons */}
          <Section>
            <h2 className="text-base font-bold text-heading">Buttons</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Toggle
                    on={config?.cancelEnabled ?? true}
                    onChange={() => patch({ cancelEnabled: !config?.cancelEnabled })}
                    label="Cancel Button"
                  />
                  <span className="text-sm text-heading">Cancel</span>
                </div>
                {config?.cancelEnabled && (
                  <input
                    className={`${inputClass} max-w-[160px]`}
                    maxLength={PAYMENT_CARD_MAX.cancelLabel}
                    value={config?.cancelLabel ?? "Cancel"}
                    onChange={(e) => patch({ cancelLabel: e.target.value })}
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Toggle
                    on={config?.submitEnabled ?? true}
                    onChange={() => patch({ submitEnabled: !config?.submitEnabled })}
                    label="Submit Button"
                  />
                  <span className="text-sm text-heading">Submit</span>
                </div>
                {config?.submitEnabled && (
                  <input
                    className={`${inputClass} max-w-[200px]`}
                    maxLength={PAYMENT_CARD_MAX.submitLabel}
                    value={config?.submitLabel ?? "Submit Payment"}
                    onChange={(e) => patch({ submitLabel: e.target.value })}
                  />
                )}
              </div>
              {config?.submitEnabled && (
                <div>
                  <label className={labelClass} htmlFor="submitting-label">Submitting State</label>
                  <input
                    id="submitting-label"
                    className={`${inputClass} max-w-[240px]`}
                    maxLength={PAYMENT_CARD_MAX.submittingLabel}
                    value={config?.submittingLabel ?? "Submitting Payment..."}
                    onChange={(e) => patch({ submittingLabel: e.target.value })}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Save */}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !config}
            className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving…" : "Save Payment Card"}
          </button>
        </div>

        {/* ─── Live Preview (right) ─── */}
        <div>
          <p className={labelClass}>Live Preview — Student View</p>
          <PreviewCard config={config} />
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Live Preview — mirrors the student EnrollModal payment card exactly.
   Same layout, same spacing, same fields, same buttons, same styling.
   ──────────────────────────────────────────────────────────────────────────── */

function PreviewCard({ config }: { config: PaymentCardConfig | null }) {
  if (!config) {
    return (
      <div className="sticky top-24 rounded-2xl border border-primary-600/30 bg-gradient-to-br from-dark-900 via-dark-950 to-black p-6 shadow-xl shadow-black/40">
        <AccessLoading label="Loading preview…" />
      </div>
    );
  }

  const hasBkash = config.bkashEnabled && config.bkashNumber;
  const hasNagad = config.nagadEnabled && config.nagadNumber;
  const hasMethods = hasBkash || hasNagad;

  return (
    <div className="sticky top-24 rounded-2xl border border-primary-600/30 bg-gradient-to-br from-dark-900 via-dark-950 to-black p-6 shadow-xl shadow-black/40">
      {/* Fee + Coupon */}
      {config.feeEnabled && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {config.feeLabel || "Course Fee"}
              </p>
              <p className="text-sm font-semibold text-neutral-300">৳1,500</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {config.discountLabel || "Discount"}
              </p>
              <p className="text-sm font-semibold text-emerald-400">− ৳500</p>
            </div>
          </div>
          {config.couponEnabled && (
            <div className="w-full sm:max-w-[160px] lg:max-w-xs">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-dark-900 px-3 py-2 text-sm text-heading placeholder:text-neutral-600">
                  <span className="text-neutral-500">{config.couponPlaceholder || "COUPON CODE"}</span>
                </div>
                <div className="shrink-0 rounded-xl border border-primary-500/40 bg-primary-600/10 px-3 py-2 text-xs font-bold text-primary-300">
                  {config.applyLabel || "Apply"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payable Amount */}
      {config.payableEnabled && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary-500/30 bg-primary-600/10 px-4 py-3">
          <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-neutral-400">
            {config.payableLabel || "Payable Amount"}
          </p>
          <p className="shrink-0 text-lg font-extrabold text-primary-400 sm:text-xl">৳1,000</p>
        </div>
      )}

      {/* Payment Methods */}
      {hasMethods && (
        <div className="mt-3 rounded-xl border border-primary-500/20 bg-primary-600/5 p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              {config.methodsLabel || "Payment Methods"}
            </p>
            <div className="flex flex-wrap gap-2">
              {hasBkash && (
                <div className="flex items-center gap-2 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-1.5">
                  <span className="text-xs font-extrabold text-pink-300">{config.bkashLabel || "bKash"}</span>
                  <span className="font-mono text-sm font-semibold text-heading truncate max-w-[120px] sm:max-w-xs">
                    {config.bkashNumber}
                  </span>
                </div>
              )}
              {hasNagad && (
                <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5">
                  <span className="text-xs font-extrabold text-orange-300">{config.nagadLabel || "Nagad"}</span>
                  <span className="font-mono text-sm font-semibold text-heading truncate max-w-[120px] sm:max-w-xs">
                    {config.nagadNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasMethods && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">No payment method enabled.</p>
        </div>
      )}

      {/* Instructions */}
      {config.instructionsEnabled && (config.instructions || config.note) && (
        <div className="mt-3">
          {config.instructions && (
            <p className="whitespace-pre-line text-xs leading-relaxed text-neutral-300">
              {config.instructions}
            </p>
          )}
          {config.note && (
            <p className="mt-2 whitespace-pre-line rounded-lg border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 px-3 py-2 text-[11px] text-neutral-400">
              {config.note}
            </p>
          )}
        </div>
      )}

      {/* Transaction ID */}
      {config.txEnabled && (
        <div className="mt-3">
          <label className="text-xs font-semibold text-neutral-400">
            {config.txLabel || "Transaction ID"}
          </label>
          <div className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-900 px-3 py-2 text-sm text-neutral-500">
            {config.txPlaceholder || "e.g. 8N7DQK2XLM"}
          </div>
        </div>
      )}

      {/* Payment From Number */}
      {config.senderEnabled && (
        <div className="mt-3">
          <label className="text-xs font-semibold text-neutral-400">
            {config.senderLabel || "Payment From Number"}
          </label>
          <div className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-900 px-3 py-2 text-sm text-neutral-500">
            {config.senderPlaceholder || "01XXXXXXXXX"}
          </div>
        </div>
      )}

      {/* Pending Note */}
      {config.pendingNoteEnabled && config.pendingNote && (
        <p className="mt-3 text-xs leading-relaxed text-neutral-400">
          {config.pendingNote}
        </p>
      )}

      {/* Buttons */}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {config.cancelEnabled && (
          <div className="w-full flex-1 rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 text-center text-sm font-semibold text-heading">
            {config.cancelLabel || "Cancel"}
          </div>
        )}
        {config.submitEnabled && (
          <div className="w-full flex-[2] rounded-xl bg-primary-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-primary-900/40">
            {config.submitLabel || "Submit Payment"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Shared tiny components
   ──────────────────────────────────────────────────────────────────────────── */

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-5">
      {children}
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
