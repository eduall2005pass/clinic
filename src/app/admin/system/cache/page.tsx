"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  cardClass,
  buttonDangerClass,
  noticeClass,
  type Notice,
} from "@/components/admin/admin-ui";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { ZapIcon } from "@/components/admin/icons";

type CacheTarget = { id: string; label: string; description: string };

export default function CachePage() {
  const gate = useAdminGate();
  const [targets, setTargets] = useState<CacheTarget[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [clearedAt, setClearedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/system/cache", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { targets?: CacheTarget[] }) => setTargets(data.targets ?? []))
      .catch(() => setTargets([]));
  }, [gate.ready, gate.headers]);

  const clear = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/system/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; clearedAt?: string }
        | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to clear the cache." });
        return;
      }
      setClearedAt(data?.clearedAt ?? new Date().toISOString());
      setNotice({ kind: "success", text: "Cache cleared. Database data was not touched." });
    } finally {
      setBusy(false);
    }
  }, [gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading cache settings…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">Cache</h2>
        <p className="mt-1.5 text-sm text-slate-500 admin-dark:text-slate-400">
          Clear application caches to serve fresh content. Database data is never deleted.
        </p>
      </header>

      <div className={`${cardClass} mt-5 divide-y divide-neutral-100 p-0 admin-dark:divide-zinc-800`}>
        {(targets ?? []).map((target) => (
          <div key={target.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600">
              <ZapIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{target.label}</span>
              <span className="block text-xs text-slate-500">{target.description}</span>
            </span>
          </div>
        ))}
        {targets?.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-500">No clearable caches detected.</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !targets?.length}
          className={buttonDangerClass}
          onClick={() => setConfirming(true)}
        >
          {busy ? "Clearing…" : "Clear cache"}
        </button>
        {clearedAt && (
          <span className="text-xs text-slate-400">
            Last cleared: {new Date(clearedAt).toLocaleString()}
          </span>
        )}
      </div>

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}

      <AdminConfirmDialog
        open={confirming}
        title="Clear cache?"
        message="Cached pages and data will be purged so fresh content is served. This will NOT delete any database data."
        confirmLabel={busy ? "Clearing…" : "Yes, clear cache"}
        danger
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void clear();
        }}
      />
    </section>
  );
}
