"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  inputClass,
  buttonPrimaryClass,
  type Notice,
} from "@/components/admin/admin-ui";

type PricingRow = { slug: string; name: string; fee: number; discountFee: number | null };

export default function PricingPage() {
  const gate = useAdminGate();
  const [rows, setRows] = useState<PricingRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/courses/pricing", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { pricing?: PricingRow[] };
      setRows(data.pricing ?? []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading pricing…" />
    );
  }

  function update(slug: string, patch: Partial<PricingRow>) {
    setRows((prev) => (prev ?? []).map((row) => (row.slug === slug ? { ...row, ...patch } : row)));
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/courses/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({
          updates: (rows ?? []).map((row) => ({ slug: row.slug, fee: row.fee, discountFee: row.discountFee })),
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; updated?: number } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to update pricing." });
        return;
      }
      setNotice({ kind: "success", text: `Pricing updated for ${data?.updated ?? 0} courses.` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Pricing</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Bulk-update fees and discount prices. Leave discount empty for no discount.
        </p>
      </header>

      <div className={`${cardClass} mt-5 divide-y divide-neutral-100 admin-dark:divide-zinc-800`}>
        {(rows ?? []).map((row) => (
          <div key={row.slug} className="flex flex-wrap items-center gap-3 p-4">
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
              {row.name}
            </span>
            <label className="text-xs font-bold text-zinc-500">
              Fee
              <input
                type="number"
                min="0"
                value={row.fee}
                onChange={(event) => update(row.slug, { fee: Number(event.target.value) || 0 })}
                aria-label={`Fee for ${row.name}`}
                className={`${inputClass} mt-1 w-28`}
              />
            </label>
            <label className="text-xs font-bold text-zinc-500">
              Discount
              <input
                type="number"
                min="0"
                value={row.discountFee ?? ""}
                placeholder="—"
                onChange={(event) =>
                  update(row.slug, {
                    discountFee:
                      event.target.value === "" ? null : Number(event.target.value) || 0,
                  })
                }
                aria-label={`Discount fee for ${row.name}`}
                className={`${inputClass} mt-1 w-28`}
              />
            </label>
          </div>
        ))}
        {rows !== null && rows.length === 0 && (
          <p className="p-8 text-center text-sm text-zinc-500">No courses yet.</p>
        )}
      </div>

      <button type="button" onClick={() => void save()} disabled={busy || !rows?.length} className={`${buttonPrimaryClass} mt-6`}>
        {busy ? "Saving…" : "Save All Pricing"}
      </button>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
