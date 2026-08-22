"use client";

import { useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass } from "@/components/admin/admin-ui";

type Status = {
  databaseOnline: boolean;
  databaseLatencyMs: number | null;
  counts: Record<string, number>;
  runtime?: { nodeVersion: string; region: string | null; uptimeSeconds: number };
};

const COUNT_LABELS: Record<string, string> = {
  students: "Students",
  enrollments: "Enrollments",
  courses: "Courses",
  exams: "Exams",
  examQuestions: "Exam Questions",
  admins: "Admins",
  uploads: "Uploaded Files",
};

export default function StatusPage() {
  const gate = useAdminGate();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/system/status", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: Status) => setStatus(data))
      .catch(() => undefined);
  }, [gate.ready, gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Checking system status…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">System Status</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Live health of the platform backend.</p>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`${cardClass} p-5`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">MySQL</p>
          <p className={`mt-1 flex items-center gap-2 text-lg font-extrabold ${status?.databaseOnline ? "text-emerald-600" : "text-red-500"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${status?.databaseOnline ? "bg-emerald-500" : "bg-red-500"}`} />
            {status === null ? "Checking…" : status.databaseOnline ? "Online" : "Offline"}
          </p>
          {status?.databaseLatencyMs != null && (
            <p className="mt-1 text-xs text-zinc-400">{status.databaseLatencyMs} ms latency</p>
          )}
        </div>
        <div className={`${cardClass} p-5`}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Runtime</p>
          <p className="mt-1 text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
            Node {status?.runtime?.nodeVersion ?? "—"}
          </p>
          {status?.runtime?.uptimeSeconds != null && (
            <p className="mt-1 text-xs text-zinc-400">
              uptime {Math.floor(status.runtime.uptimeSeconds / 3600)}h {Math.floor((status.runtime.uptimeSeconds % 3600) / 60)}m
              {status.runtime.region ? ` · region ${status.runtime.region}` : ""}
            </p>
          )}
        </div>
      </div>

      {status && (
        <div className={`${cardClass} mt-4 divide-y divide-neutral-100 p-0 admin-dark:divide-zinc-800`}>
          {Object.entries(COUNT_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">{label}</span>
              <span className="text-sm font-extrabold tabular-nums text-zinc-900 admin-dark:text-zinc-100">
                {(status.counts[key] ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
