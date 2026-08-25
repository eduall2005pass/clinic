"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { SocialLink } from "@/lib/social-links-constants";

export default function SocialLinksManagementPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<SocialLink[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Admin check
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!cancelled) setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load links
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch("/api/social-links", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { links?: SocialLink[] };
        if (!cancelled && data.links) setLinks(data.links);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user]);

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && loading)) {
    return <AccessLoading label="Loading social links…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Social Links management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!links) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load social links. Please refresh the page.
        </p>
      </section>
    );
  }

  function patchLink(key: string, patch: Partial<SocialLink>) {
    setLinks((prev) =>
      prev
        ? prev.map((link) => (link.key === key ? { ...link, ...patch } : link))
        : prev,
    );
  }

  function moveLink(index: number, direction: -1 | 1) {
    setLinks((prev) => {
      if (!prev) return prev;
      const items = [...prev];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }

  async function handleSave() {
    if (!user || !links) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/social-links", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          links: links.map((link) => ({
            key: link.key,
            url: link.url?.trim() || null,
            isActive: link.isActive,
          })),
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save social links." });
        toast.showToast("error", data.error ?? "Failed to save social links.");
        return;
      }
      setNotice({ kind: "success", text: "Social links saved. Live website updated." });
      toast.showToast("success", "Social links saved. Live website updated.");
    } catch {
      setNotice({ kind: "error", text: "Failed to save social links." });
      toast.showToast("error", "Failed to save social links.");
    } finally {
      setSaving(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500/60 focus:bg-white admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Social Links
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Manage the social platform links shown in the website footer.
          Changes go live immediately after saving.
        </p>
      </header>

      {/* Platforms */}
      <ul className="mt-6 space-y-3">
        {links.map((link, index) => (
          <li key={link.key} className={`${cardClass} ${link.isActive ? "" : "opacity-70"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-sm font-extrabold text-primary-600">
                {link.label.charAt(0)}
              </span>
              <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
                {link.label}
              </h3>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${link.label} up`}
                  onClick={() => moveLink(index, -1)}
                  disabled={index === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${link.label} down`}
                  onClick={() => moveLink(index, 1)}
                  disabled={index === links.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                >
                  ▼
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={link.isActive}
                  aria-label={`Toggle ${link.label}`}
                  onClick={() => patchLink(link.key, { isActive: !link.isActive })}
                  className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition ${
                    link.isActive
                      ? "bg-primary-600"
                      : "bg-zinc-300 admin-dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                      link.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">URL</span>
              <input
                type="url"
                value={link.url ?? ""}
                maxLength={1024}
                placeholder={`https://${link.key}.com/medispark`}
                onChange={(event) => patchLink(link.key, { url: event.target.value })}
                className={inputClass}
              />
            </label>
            {!link.url && (
              <p className="mt-2 text-[11px] font-semibold text-amber-600 admin-dark:text-amber-400">
                No URL set — this platform will not appear on the website even when enabled.
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* Notice */}
      {notice && (
        <p
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </section>
  );
}
