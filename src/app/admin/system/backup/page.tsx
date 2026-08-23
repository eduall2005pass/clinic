"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  noticeClass,
  cardClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  type Notice,
} from "@/components/admin/admin-ui";

type Backup = { id: string; fileName: string; size: number; createdAt: string };

type RestoreSummary = {
  tables?: Record<string, number>;
  skipped?: string[];
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function BackupPage() {
  const gate = useAdminGate();
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/backup", { cache: "no-store", headers: gate.headers });
      const data = (await response.json()) as { backups?: Backup[] };
      setBackups(data.backups ?? []);
    } catch {
      setBackups([]);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage
        title="Administrators only"
        message="Backup management is restricted to administrators with system access."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    ) : (
      <AccessLoading label="Loading backups…" />
    );
  }

  async function create() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
      });
      const data = (await response.json().catch(() => null)) as { error?: string; backups?: Backup[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to create the backup." });
        return;
      }
      setBackups(data?.backups ?? []);
      setNotice({ kind: "success", text: "Backup created and stored securely." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, fileName: string) {
    if (!window.confirm(`Delete backup “${fileName}”? This cannot be undone.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; backups?: Backup[] } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to delete." });
        return;
      }
      setBackups(data?.backups ?? []);
      setNotice({ kind: "success", text: "Backup deleted." });
    } finally {
      setBusy(false);
    }
  }

  async function restore(backup: Backup) {
    const answer = window.prompt(
      `Restore “${backup.fileName}”?\n\nThis will OVERWRITE current data with the backup contents. Type RESTORE to confirm.`,
    );
    if (answer !== "RESTORE") {
      setNotice({ kind: "error", text: "Restore cancelled — confirmation did not match." });
      return;
    }
    setBusy(true);
    setNotice(null);
    setRestoreSummary(null);
    try {
      const response = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gate.headers },
        body: JSON.stringify({ id: backup.id, confirm: true }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; summary?: RestoreSummary }
        | null;
      if (!response.ok || !data?.summary) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to restore the backup." });
        return;
      }
      setRestoreSummary(data.summary);
      setNotice({
        kind: "success",
        text: `Restore complete — ${Object.keys(data.summary.tables ?? {}).length} tables restored.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Backup</h2>
          <p className="mt-1.5 max-w-xl text-sm text-zinc-500 admin-dark:text-zinc-400">
            Snapshots of the important database tables, stored securely in MySQL.
            Downloads and restores require system admin permission — database
            credentials are never exposed.
          </p>
        </div>
        <button type="button" onClick={() => void create()} disabled={busy} className={buttonPrimaryClass}>
          {busy ? "Working…" : "+ Create Backup"}
        </button>
      </header>

      <ul className="mt-5 space-y-2">
        {(backups ?? []).map((backup) => (
          <li key={backup.id} className={`${cardClass} flex flex-wrap items-center gap-2 px-4 py-3`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                {backup.fileName}
              </span>
              <span className="block text-xs text-zinc-500">
                {new Date(backup.createdAt).toLocaleString()} · {formatSize(backup.size)}
              </span>
            </span>
            <a
              href={`/api/admin/backup/download?id=${encodeURIComponent(backup.id)}`}
              className={buttonSecondaryClass}
            >
              Download
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore(backup)}
              className={buttonSecondaryClass}
            >
              Restore
            </button>
            <button
              type="button"
              disabled={busy}
              aria-label={`Delete ${backup.fileName}`}
              onClick={() => void remove(backup.id, backup.fileName)}
              className={buttonDangerClass}
            >
              ✕
            </button>
          </li>
        ))}
        {(backups ?? []).length === 0 && backups !== null && (
          <li className={`${cardClass} p-8 text-center text-xs font-semibold text-zinc-500`}>
            No backups yet. Create the first snapshot.
          </li>
        )}
      </ul>

      {restoreSummary && (
        <div className={`${cardClass} mt-4 p-4`}>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">Last restore summary</h3>
          <p className="mt-2 text-xs text-zinc-500">
            Restored:{" "}
            {Object.entries(restoreSummary.tables ?? {})
              .map(([table, count]) => `${table} (${count})`)
              .join(", ") || "nothing"}
          </p>
          {(restoreSummary.skipped?.length ?? 0) > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              Skipped (missing or unchanged schema): {restoreSummary.skipped?.join(", ")}
            </p>
          )}
        </div>
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
