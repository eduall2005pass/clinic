"use client";

import { useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass } from "@/components/admin/admin-ui";

type LogEntry = {
  id: number;
  adminEmail: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function ActivityLogsPage() {
  const gate = useAdminGate();
  const [logs, setLogs] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/activity-logs?limit=200", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { logs?: LogEntry[] }) => setLogs(data.logs ?? []))
      .catch(() => setLogs([]));
  }, [gate.ready, gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading activity logs…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Activity Logs</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Audit trail of admin logins and panel actions (latest 200).
        </p>
      </header>

      {logs === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : logs.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>No activity recorded yet.</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {logs.map((log) => (
            <li key={log.id} className={`${cardClass} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-xs sm:text-sm`}>
              <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-600">
                {log.action}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-zinc-700 admin-dark:text-zinc-200">
                {log.adminEmail || log.detail || "—"}
              </span>
              <span className="text-zinc-400">{new Date(log.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
