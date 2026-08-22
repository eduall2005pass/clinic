"use client";

import { useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass } from "@/components/admin/admin-ui";

type Storage = { files: number; bytes: number; note: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StoragePage() {
  const gate = useAdminGate();
  const [storage, setStorage] = useState<Storage | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/system/storage", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { storage?: Storage }) => setStorage(data.storage ?? null))
      .catch(() => undefined);
  }, [gate.ready, gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading storage stats…" />
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Storage</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">MySQL uploads table usage.</p>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className={`${cardClass} p-5`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Files</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-100">
            {(storage?.files ?? 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div className={`${cardClass} p-5`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Total size</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-900 admin-dark:text-zinc-100">
            {formatBytes(storage?.bytes ?? 0)}
          </p>
        </div>
      </div>

      <p className={`${cardClass} mt-4 p-4 text-xs leading-relaxed text-zinc-500`}>
        All uploads (logos, favicons, banners, course images, profile pictures) are stored as LONGBLOB rows in the
        MySQL `uploads` table and served through /api/files/[id]. Manage individual files from Content → Media Library.
      </p>
    </section>
  );
}
