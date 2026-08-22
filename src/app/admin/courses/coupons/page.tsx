"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  labelClass,
  buttonPrimaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Coupon = {
  code: string;
  discountType: "percent" | "flat";
  value: number;
  maxUses: number;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

const EMPTY = { code: "", discountType: "percent" as "percent" | "flat", value: "10", maxUses: "0", startsAt: "", expiresAt: "" };

export default function CouponsPage() {
  const gate = useAdminGate();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/coupons", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { coupons?: Coupon[] };
      setCoupons(data.coupons ?? []);
    } catch {
      setCoupons([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading coupons…" />
    );
  }

  async function save() {
    if (!form.code.trim()) {
      setNotice({ kind: "error", text: "Enter a coupon code." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discountType: form.discountType,
          value: Number(form.value) || 0,
          maxUses: Number(form.maxUses) || 0,
          startsAt: form.startsAt || null,
          expiresAt: form.expiresAt || null,
          isActive: true,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; coupons?: Coupon[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setCoupons(data?.coupons ?? []);
      setForm(EMPTY);
      setNotice({ kind: "success", text: "Coupon saved." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(code: string) {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => null)) as { coupons?: Coupon[] } | null;
      if (data?.coupons) setCoupons(data.coupons);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Coupons</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Discount codes validated at checkout.
        </p>
      </header>

      <div className={`${cardClass} mt-5 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">New / update coupon</h3>
        <form
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div>
            <label className={labelClass} htmlFor="cp-code">Code</label>
            <input id="cp-code" className={`${inputClass} uppercase`} placeholder="HSC28" value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-type">Discount type</label>
            <select id="cp-type" className={inputClass} value={form.discountType}
              onChange={(event) => setForm({ ...form, discountType: event.target.value as "percent" | "flat" })}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (৳)</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-value">Value</label>
            <input id="cp-value" type="number" min="0" className={inputClass} value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-max">Max uses (0 = unlimited)</label>
            <input id="cp-max" type="number" min="0" className={inputClass} value={form.maxUses}
              onChange={(event) => setForm({ ...form, maxUses: event.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-start">Starts at (optional)</label>
            <input id="cp-start" type="datetime-local" className={inputClass} value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="cp-expire">Expires at (optional)</label>
            <input id="cp-expire" type="datetime-local" className={inputClass} value={form.expiresAt}
              onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonPrimaryClass}>
              {busy ? "Saving…" : "Save Coupon"}
            </button>
          </div>
        </form>
      </div>

      <ul className="mt-5 space-y-2">
        {(coupons ?? []).map((coupon) => (
          <li key={coupon.code} className={`${cardClass} flex flex-wrap items-center gap-3 px-4 py-3`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">{coupon.code}</span>
              <span className="block text-xs text-zinc-500">
                {coupon.discountType === "percent" ? `${coupon.value}% off` : `৳ ${coupon.value} off`}
                {" · used "}{coupon.usedCount}{coupon.maxUses > 0 ? `/${coupon.maxUses}` : ""}
                {!coupon.isActive && " · inactive"}
                {coupon.expiresAt && ` · expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
              </span>
            </span>
            <button type="button" disabled={busy} aria-label={`Delete ${coupon.code}`} className={buttonDangerClass}
              onClick={() => void remove(coupon.code)}>
              ✕
            </button>
          </li>
        ))}
        {(coupons ?? []).length === 0 && coupons !== null && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs font-semibold text-zinc-500 admin-dark:border-zinc-700">
            No coupons yet.
          </li>
        )}
      </ul>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
