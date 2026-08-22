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

export default function SystemLogsPage() {
  const gate = useAdminGate();
  const [logs, setLogs] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/system/logs?limit=100", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { logs?: LogEntry[] }) => setLogs(data.logs ?? []))
      .catch(() => setLogs([]));
  }, [gate.ready, gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading logs…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">System Logs</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Latest 100 admin activity entries.</p>
      </header>

      {logs === null ? (
        <pre className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</pre>
      ) : logs.length === 0 ? (
        <pre className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>No log entries.</pre>
      ) : (
        <pre className={`${cardClass} mt-5 max-h-[70vh] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-600 admin-dark:text-zinc-300`}>
{logs
  .map(
    (log) =>
      `${new Date(log.createdAt).toISOString()}  ${log.action.padEnd(18)} ${log.adminEmail || "—"}${log.detail ? ` · ${log.detail}` : ""}${log.ipAddress ? ` · ${log.ipAddress}` : ""}`,
  )
  .join("\n")}
        </pre>
      )}
    </section>
  );
}
