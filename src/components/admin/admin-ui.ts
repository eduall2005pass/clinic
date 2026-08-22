"use client";

import { useEffect, useState } from "react";
import { getAuth, onIdTokenChanged } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";

export type AdminGate = {
  ready: boolean;
  denied: boolean;
  token: string | null;
  /** Auth headers for admin API calls. */
  headers: Record<string, string>;
};

/** Shared admin access gate — verifies the signed-in user is an admin. */
export function useAdminGate(): AdminGate {
  const { user, authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Admin check — runs once per signed-in user.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/admin", {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | { isAdmin?: boolean }
          | null;
        if (!cancelled) setIsAdmin(Boolean(response.ok && data?.isAdmin));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Keep the token fresh: Firebase rotates ID tokens hourly, and a stale
  // token in state made every admin write fail with 401 after an hour.
  useEffect(() => {
    if (!user) return;
    return onIdTokenChanged(getAuth(), (refreshed) => {
      void refreshed?.getIdToken().then(setToken).catch(() => setToken(null));
    });
  }, [user]);

  const denied =
    (!authLoading && !user) || (authLoading === false && isAdmin === false);
  const ready = !authLoading && isAdmin === true;

  return {
    ready,
    denied,
    token,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

export type Notice = { kind: "success" | "error"; text: string };

export const noticeClass = (notice: Notice): string =>
  `mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
    notice.kind === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
      : "border-red-500/30 bg-red-500/10 text-red-500"
  }`;

export const cardClass =
  "rounded-2xl border border-neutral-200 bg-white shadow-sm transition-colors duration-300 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";

export const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100";

export const labelClass =
  "mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 admin-dark:text-zinc-400";

export const buttonPrimaryClass =
  "rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondaryClass =
  "rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/60 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300";

export const buttonDangerClass =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-red-500 transition hover:border-red-500/60 hover:bg-red-500/10 admin-dark:border-zinc-700";
