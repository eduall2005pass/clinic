"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate, cardClass, type Notice, noticeClass } from "@/components/admin/admin-ui";

type Profile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  phoneNumber: string | null;
};

type Overview = {
  profile?: Profile;
  status?: string;
  role?: string | null;
  lastLoginAt?: string | null;
};

const QUICK_LINKS = [
  {
    title: "Account Settings",
    description: "Update your display name, phone number and profile picture.",
    href: "/admin/profile/account",
  },
  {
    title: "Password & Security",
    description: "Password and sign-in method are managed by your Google account.",
    href: "/admin/profile/security",
  },
  {
    title: "Login Activity",
    description: "Review your recent admin panel sessions.",
    href: "/admin/profile/login-activity",
  },
];

export default function AdminProfilePage() {
  const gate = useAdminGate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/profile", {
        cache: "no-store",
        headers: gate.headers,
      });
      if (!response.ok) {
        setLoadFailed(true);
        return;
      }
      const data = (await response.json()) as Overview;
      setOverview(data);
      setLoadFailed(!data.profile);
    } catch {
      setLoadFailed(true);
    }
  }, [gate.headers]);

  useEffect(() => {
    if (gate.ready) void Promise.resolve().then(load);
  }, [gate.ready, load]);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage
        title="Administrators only"
        message="The admin profile is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    ) : (
      <AccessLoading label="Loading your profile…" />
    );
  }

  const profile = overview?.profile;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Admin Profile
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500 admin-dark:text-zinc-400">
          Your administrator account overview. Sensitive details are managed
          through the existing secure sign-in system.
        </p>
      </header>

      {loadFailed && !profile ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-red-500`}>
          Could not load your profile. Please refresh the page.
        </p>
      ) : !profile ? (
        <p className={`${cardClass} mt-5 p-6 text-center text-sm text-zinc-500`}>Loading…</p>
      ) : (
        <>
          {/* Overview card */}
          <div className={`${cardClass} mt-5 p-5 sm:p-6`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoUrl}
                  alt="Profile"
                  className="h-20 w-20 shrink-0 rounded-full object-cover shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-2xl font-extrabold text-primary-600">
                  {(profile.displayName ?? profile.email ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-extrabold text-zinc-900 admin-dark:text-zinc-50">
                  {profile.displayName ?? "—"}
                </p>
                <p className="truncate text-sm text-zinc-500">{profile.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                      overview?.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                        : "bg-zinc-500/10 text-zinc-500"
                    }`}
                  >
                    ● {overview?.status === "active" ? "Active" : "Unknown status"}
                  </span>
                  <span className="rounded-full bg-primary-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary-600 admin-dark:text-primary-400">
                    {overview?.role ?? "Admin"}
                  </span>
                </div>
              </div>
              <Link
                href="/admin/profile/account"
                className="shrink-0 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 active:scale-[0.98]"
              >
                Edit Profile
              </Link>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-neutral-200/60 pt-5 sm:grid-cols-2 admin-dark:border-zinc-800">
              <div>
                <dt className="text-xs font-semibold text-zinc-500">Email</dt>
                <dd className="mt-1 truncate text-sm font-medium text-zinc-900 admin-dark:text-zinc-100">
                  {profile.email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">Phone</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 admin-dark:text-zinc-100">
                  {profile.phoneNumber || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">Last login</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 admin-dark:text-zinc-100">
                  {overview?.lastLoginAt
                    ? new Date(overview.lastLoginAt).toLocaleString()
                    : "No login recorded yet"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500">Password</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 admin-dark:text-zinc-100">
                  Managed by Google sign-in{" "}
                  <Link
                    href="/admin/profile/security"
                    className="text-primary-600 hover:underline admin-dark:text-primary-400"
                  >
                    (details)
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick links */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${cardClass} group p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary-500/60`}
              >
                <p className="text-sm font-bold text-zinc-900 transition group-hover:text-primary-600 admin-dark:text-zinc-100">
                  {link.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{link.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {notice && <p role="status" className={noticeClass(notice)}>{notice.text}</p>}
    </section>
  );
}
