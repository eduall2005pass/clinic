"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export type AccessRequirement = "registered" | "enrolled" | "paid";

export function AccessMessage({
  title,
  message,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-ink/10 bg-dark-900 p-10 text-center shadow-lg shadow-black/20">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500">
          <svg
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <h2 className="mt-5 text-xl font-bold text-heading">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
          {message}
        </p>
        <Link
          href={actionHref}
          className="mt-6 block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          {actionLabel}
        </Link>
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="mt-3 block rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

export function AccessLoading({ label }: { label: string }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
    </main>
  );
}

export function AccessGate({
  requirement,
  children,
  title,
  message,
  actionLabel,
  actionHref,
  loadingLabel,
  secondaryLabel,
  secondaryHref,
  loginHref = "/login",
}: {
  requirement: AccessRequirement;
  children: ReactNode;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  loadingLabel: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  loginHref?: string;
}) {
  const router = useRouter();
  const { user, access, authLoading, profileLoading, configured } = useAuth();

  useEffect(() => {
    if (authLoading || !configured) return;
    if (!user) {
      router.replace(loginHref);
    }
  }, [user, authLoading, configured, router, loginHref]);

  if (authLoading || profileLoading) {
    return <AccessLoading label={loadingLabel} />;
  }
  if (!user) {
    return null;
  }

  const allowed =
    requirement === "registered"
      ? access.registered
      : requirement === "enrolled"
        ? access.registered && access.hasEnrollment
        : access.registered && access.hasPaidEnrollment;

  if (!allowed) {
    return (
      <AccessMessage
        title={title}
        message={message}
        actionLabel={actionLabel}
        actionHref={actionHref}
        secondaryLabel={secondaryLabel}
        secondaryHref={secondaryHref}
      />
    );
  }

  return <>{children}</>;
}