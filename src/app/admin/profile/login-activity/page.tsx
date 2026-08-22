"use client";

import { useEffect, useState } from "react";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass } from "@/components/admin/admin-ui";

type Activity = { id: number; action: string; ipAddress: string | null; createdAt: string };

export default function LoginActivityPage() {
  const gate = useAdminGate();
  const [activity, setActivity] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (!gate.ready) return;
    fetch("/api/admin/profile?loginActivity=1", { cache: "no-store", headers: gate.headers })
      .then((response) => response.json())
      .then((data: { activity?: Activity[] }) => setActivity(data.activity ?? []))
      .catch(() => setActivity([]));
  }, [gate.ready, gate.headers]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading login activity…" />
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">Login Activity</h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">Your recent admin panel sessions.</p>
      </header>

      {activity === null ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : activity.length === 0 ? (
        <p className={`${cardClass} mt-5 p-8 text-center text-sm text-zinc-500`}>No logins recorded yet.</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {activity.map((entry) => (
            <li key={entry.id} className={`${cardClass} flex items-center gap-3 px-4 py-3 text-sm`}>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600">
                {entry.action}
              </span>
              <span className="min-w-0 flex-1 truncate text-zinc-500">{entry.ipAddress ?? "unknown IP"}</span>
              <span className="shrink-0 text-xs text-zinc-400">{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
