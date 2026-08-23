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
  const [editingCode, setEditingCode] = useState<string | null>(null);
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
      setEditingCode(null);
      setNotice({ kind: "success", text: editingCode ? `Coupon ${editingCode} updated.` : "Coupon saved." });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(coupon: Coupon) {
    const toLocalInput = (iso: string | null) => {
      if (!iso) return "";
      const date = new Date(iso);
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    setEditingCode(coupon.code);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      value: String(coupon.value),
      maxUses: String(coupon.maxUses),
      startsAt: toLocalInput(coupon.startsAt),
      expiresAt: toLocalInput(coupon.expiresAt),
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(coupon: Coupon) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
          maxUses: coupon.maxUses,
          startsAt: coupon.startsAt,
          expiresAt: coupon.expiresAt,
          isActive: !coupon.isActive,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; coupons?: Coupon[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update." });
        return;
      }
      setCoupons(data?.coupons ?? []);
      setNotice({ kind: "success", text: `Coupon ${coupon.code} ${coupon.isActive ? "disabled" : "enabled"}.` });
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
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
          {editingCode ? `Edit coupon — ${editingCode}` : "New / update coupon"}
        </h3>
        {editingCode && (
          <button
            type="button"
            onClick={() => {
              setEditingCode(null);
              setForm(EMPTY);
            }}
            className="mt-1 text-xs font-semibold text-primary-600 hover:underline admin-dark:text-primary-400"
          >
            + New coupon instead
          </button>
        )}
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
              disabled={Boolean(editingCode)}
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
              {busy ? "Saving…" : editingCode ? "Update Coupon" : "Save Coupon"}
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
                {coupon.expiresAt && ` · expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
              </span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                coupon.isActive
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-zinc-500/10 text-zinc-500"
              }`}
            >
              {coupon.isActive ? "Active" : "Disabled"}
            </span>
            <button type="button" disabled={busy} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
              onClick={() => startEdit(coupon)}>
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              aria-label={coupon.isActive ? `Disable ${coupon.code}` : `Enable ${coupon.code}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                coupon.isActive
                  ? "border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10"
                  : "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              }`}
              onClick={() => void toggleActive(coupon)}
            >
              {coupon.isActive ? "Disable" : "Enable"}
            </button>
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
