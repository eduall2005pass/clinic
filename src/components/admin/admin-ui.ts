"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth, onIdTokenChanged } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";

export type AdminGate = {
  ready: boolean;
  denied: boolean;
  token: string | null;
  /** Auth headers for admin API calls. */
  headers: Record<string, string>;
  /** Current admin's role ("admin", "moderator", "teacher" …) — null while loading. */
  role: string | null;
  /** Permission categories granted by the admin's role. */
  permissions: string[];
};

/** Shared admin access gate — verifies the signed-in user is an admin. */
export function useAdminGate(): AdminGate {
  const { user, authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

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
          | { isAdmin?: boolean; role?: string; permissions?: string[] }
          | null;
        if (cancelled) return;
        if (response.ok && data?.isAdmin) {
          setIsAdmin(true);
          setRole(data.role ?? "admin");
          setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
        } else {
          setIsAdmin(false);
        }
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

  const headers = useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token],
  );

  return {
    ready,
    denied,
    token,
    headers,
    role,
    permissions,
  };
}

/** Client-side convenience: does the current admin's role grant a permission? */
export function hasAdminPermission(
  gate: Pick<AdminGate, "role" | "permissions">,
  permission: string,
): boolean {
  if (gate.role === "admin") return true;
  return gate.permissions.includes(permission);
}

export type Notice = { kind: "success" | "error"; text: string };

export const noticeClass = (notice: Notice): string =>
  `mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
    notice.kind === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 admin-dark:border-emerald-500/20 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-400"
      : "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400"
  }`;

// Unified Premium Navy Smart Card — white surface, subtle blue border/shadow, navy icons
export const cardClass =
  "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#1e3a78]/5 transition-all duration-200 hover:border-[#bfdbfe] hover:shadow-md hover:shadow-[#1e3a78]/10 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:shadow-black/20 admin-dark:hover:border-[#2f5aa0]";

export const inputClass =
  "w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce] focus:ring-2 focus:ring-[#2f6bce]/15 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#e0e8f8] admin-dark:placeholder:text-slate-500 admin-dark:focus:border-[#3b82f6]";

export const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500 admin-dark:text-[#8da0c0]";

export const buttonPrimaryClass =
  "rounded-xl bg-[#1a3a78] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#0b1e3a]/20 transition hover:bg-[#123060] hover:shadow-lg hover:shadow-[#0b1e3a]/25 active:scale-[0.98] active:bg-[#0e244a] disabled:cursor-not-allowed disabled:opacity-50 admin-dark:bg-[#234e9f] admin-dark:hover:bg-[#2f65c8] admin-dark:shadow-black/30";

export const buttonSecondaryClass =
  "rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-2 text-xs font-bold text-[#1a3a78] transition hover:border-[#93c5fd] hover:bg-[#dbeafe] hover:text-[#123060] active:bg-[#bfdbfe] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd] admin-dark:hover:border-[#2f5aa0] admin-dark:hover:bg-[#132a4f]";

export const buttonDangerClass =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-[#fecaca] bg-[#fef2f2] text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 admin-dark:border-[#7f1d1d]/50 admin-dark:bg-red-500/10 admin-dark:text-red-400 admin-dark:hover:bg-red-500/20";

export const badgeClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide";

export const badgeSuccessClass =
  "border-emerald-200 bg-emerald-50 text-emerald-700 admin-dark:border-emerald-500/20 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-400";

export const badgeWarningClass =
  "border-amber-200 bg-amber-50 text-amber-700 admin-dark:border-amber-500/20 admin-dark:bg-amber-500/10 admin-dark:text-amber-400";

export const badgeInfoClass =
  "border-[#bfdbfe] bg-[#eff6ff] text-[#1a3a78] admin-dark:border-[#1e3a65] admin-dark:bg-[#1e3a65]/50 admin-dark:text-[#93c5fd]";

export const badgeDangerClass =
  "border-red-200 bg-red-50 text-red-700 admin-dark:border-red-500/20 admin-dark:bg-red-500/10 admin-dark:text-red-400";

export const tableHeaderClass =
  "bg-[#f8fbff] text-[#1a3a78] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd]";

export const tableRowClass =
  "border-b border-[#eef4ff] transition hover:bg-[#f8fbff] admin-dark:border-[#1e3a65]/50 admin-dark:hover:bg-[#132a4f]/50";
