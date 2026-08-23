"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import {
  useAdminGate,
  cardClass,
  inputClass,
  buttonSecondaryClass,
} from "@/components/admin/admin-ui";

type LogEntry = {
  id: number;
  adminEmail: string;
  action: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
};

const MODULES = [
  "",
  "auth",
  "coupon",
  "course",
  "exam",
  "student",
  "enrollment",
  "notification",
  "media",
  "jersey",
  "roles",
  "security",
  "profile",
  "settings",
];

const ACTIONS = ["", "login", "logout", "save", "update", "delete", "upload", "restore", "permission", "status"];

function moduleOf(action: string): string {
  const dot = action.indexOf(".");
  return dot === -1 ? "general" : action.slice(0, dot);
}

export default function ActivityLogsPage() {
  const gate = useAdminGate();
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLogs(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (q.trim()) params.set("q", q.trim());
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/admin/activity-logs?${params.toString()}`, {
        cache: "no-store",
        headers: gate.headers,
      });
      const data = (await response.json()) as { logs?: LogEntry[] };
      setLogs(data.logs ?? []);
    } catch {
      setLogs([]);
    }
  }, [gate.headers, q, module, action, from, to]);

  useEffect(() => {
    if (!gate.ready) return;
    const timer = setTimeout(() => void Promise.resolve().then(load), q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [gate.ready, load, q]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading activity logs…" />
    );
  }

  const hasFilters = Boolean(q || module || action || from || to);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Activity Logs</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Audit trail of admin logins and panel actions (latest 200 matches).
        </p>
      </header>

      {/* Search & filters */}
      <div className={`${cardClass} mt-5 p-4`}>
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search by admin email, action or record…"
          className={inputClass}
          aria-label="Search activity logs"
        />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select value={module} onChange={(event) => setModule(event.target.value)} aria-label="Filter by module" className={inputClass}>
            {MODULES.map((item) => (
              <option key={item} value={item}>{item || "All modules"}</option>
            ))}
          </select>
          <select value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filter by action" className={inputClass}>
            {ACTIONS.map((item) => (
              <option key={item} value={item}>{item || "All actions"}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" className={inputClass} />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" className={inputClass} />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setModule("");
              setAction("");
              setFrom("");
              setTo("");
            }}
            className={`${buttonSecondaryClass} mt-3 px-3 py-1.5 text-xs`}
          >
            Clear filters
          </button>
        )}
      </div>

      {logs === null ? (
        <p className={`${cardClass} mt-4 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : logs.length === 0 ? (
        <p className={`${cardClass} mt-4 p-8 text-center text-sm text-zinc-500`}>
          No activity found{hasFilters ? " for these filters." : " yet."}
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {logs.map((log) => (
            <li key={log.id} className={`${cardClass} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-xs sm:text-sm`}>
              <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">
                {moduleOf(log.action)}
              </span>
              <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-600">
                {log.action.includes(".") ? log.action.split(".")[1] : log.action}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-zinc-700 admin-dark:text-zinc-200" title={log.detail ?? undefined}>
                {log.adminEmail}{log.detail ? ` · ${log.detail}` : ""}
              </span>
              <span className="text-zinc-400">{new Date(log.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
