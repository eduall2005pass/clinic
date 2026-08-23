"use client";

import { useCallback, useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass, buttonSecondaryClass } from "@/components/admin/admin-ui";

type Status = {
  apiOnline?: boolean;
  databaseOnline: boolean;
  databaseLatencyMs: number | null;
  databaseVersion: string | null;
  storageOnline: boolean | null;
  storageLatencyMs: number | null;
  storageHost: string | null;
  firebaseAdminConfigured?: boolean;
  counts: Record<string, number>;
  runtime?: {
    nodeVersion: string;
    region: string | null;
    uptimeSeconds: number;
    mysqlConfigured?: boolean;
  };
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

function StatusCard({
  label,
  state,
  detail,
}: {
  label: string;
  /** true = online, false = offline, null/undefined = unknown */
  state: boolean | null | undefined;
  detail?: React.ReactNode;
}) {
  const online = state === true;
  const unknown = state !== true && state !== false;
  return (
    <div className={`${cardClass} p-5`}>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{label}</p>
      <p
        className={`mt-1 flex items-center gap-2 text-lg font-extrabold ${
          unknown ? "text-zinc-500" : online ? "text-emerald-600" : "text-red-500"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            unknown ? "bg-zinc-400" : online ? "bg-emerald-500" : "bg-red-500"
          } ${online ? "animate-pulse" : ""}`}
        />
        {unknown ? "Unknown" : online ? "Operational" : "Down"}
      </p>
      {detail && <div className="mt-1 text-xs leading-relaxed text-zinc-400">{detail}</div>}
    </div>
  );
}

export default function StatusPage() {
  const gate = useAdminGate();
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/system/status", {
        cache: "no-store",
        headers: gate.headers,
      });
      if (!response.ok) throw new Error("Status check failed.");
      const data = (await response.json()) as Status;
      setStatus(data);
      setFailed(false);
    } catch {
      // The status API itself is unreachable — backend down.
      setStatus((prev) =>
        prev ?? { databaseOnline: false, databaseLatencyMs: null, databaseVersion: null, storageOnline: false, storageLatencyMs: null, storageHost: null, counts: {} },
      );
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="System tools are restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Checking system status…" />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">System Status</h2>
          <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Live health checks of the platform backend and services.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={refreshing} className={buttonSecondaryClass}>
          {refreshing ? "Checking…" : "↻ Refresh"}
        </button>
      </header>

      {failed && (
        <p role="status" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
          Could not reach the status API — the backend may be down or your session expired.
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatusCard
          label="Backend / API"
          state={status === null ? null : failed ? false : true}
          detail={
            status?.runtime ? (
              <>
                Node {status.runtime.nodeVersion}
                {status.runtime.region ? ` · region ${status.runtime.region}` : ""}
                {" · uptime "}
                {Math.floor(status.runtime.uptimeSeconds / 3600)}h{" "}
                {Math.floor((status.runtime.uptimeSeconds % 3600) / 60)}m
              </>
            ) : null
          }
        />

        <StatusCard
          label="Database (MySQL)"
          state={status === null ? null : status.databaseOnline}
          detail={
            <>
              {status?.databaseVersion && <>Server v{status.databaseVersion} · </>}
              {status?.databaseLatencyMs != null && <>{status.databaseLatencyMs} ms latency</>}
              {status?.runtime?.mysqlConfigured === false && " · not configured"}
            </>
          }
        />

        <StatusCard
          label="Storage (Media service)"
          state={status === null ? null : status.storageOnline}
          detail={
            <>
              {status?.storageHost ?? "—"}
              {status?.storageLatencyMs != null && <> · {status.storageLatencyMs} ms</>}
            </>
          }
        />

        <StatusCard
          label="Auth (Firebase Admin)"
          state={status === null ? null : Boolean(status.firebaseAdminConfigured)}
          detail={status?.firebaseAdminConfigured ? "Credentials configured" : "Service account not configured — admin sign-in will fail"}
        />
      </div>

      {status && (
        <div className={`${cardClass} mt-4 divide-y divide-neutral-100 p-0 admin-dark:divide-zinc-800`}>
          <p className="px-5 pt-4 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Database records</p>
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
