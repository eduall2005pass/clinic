"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { NavbarConfig, NavbarItem } from "@/lib/navbar-constants";
import { DEFAULT_NAVBAR_CONFIG } from "@/lib/navbar-constants";

type Notice = { kind: "success" | "error"; text: string };

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 admin-dark:text-slate-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-primary-600" : "bg-zinc-300 admin-dark:bg-zinc-700"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function HeaderNavbarManagementPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<NavbarConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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

  // Load config
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/navbar-settings", { cache: "no-store" });
        const data = (await res.json()) as { config?: NavbarConfig };
        if (!cancelled && data.config) setConfig(data.config);
      } catch {
        if (!cancelled) setNotice({ kind: "error", text: "Failed to load header settings." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus]);

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && loading)) {
    return <AccessLoading label="Loading header settings…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Header &amp; Navbar management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!config) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load header settings. Please refresh the page.
        </p>
      </section>
    );
  }

  function patchItem(key: string, patch: Partial<NavbarItem>) {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.key === key ? { ...item, ...patch } : item,
            ),
          }
        : prev,
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    setConfig((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, items };
    });
  }

  async function handleSave() {
    if (!user || !config) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/navbar-settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showNavbar: config.showNavbar,
          showMoreMenu: config.showMoreMenu,
          showThemeToggle: config.showThemeToggle,
          showLoginButton: config.showLoginButton,
          items: config.items,
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save header settings." });
        toast.showToast("error", data.error ?? "Failed to save header settings.");
        return;
      }
      setNotice({ kind: "success", text: "Header settings saved. Live website updated." });
      toast.showToast("success", "Header settings saved. Live website updated.");
    } catch {
      setNotice({ kind: "error", text: "Failed to save header settings." });
      toast.showToast("error", "Failed to save header settings.");
    } finally {
      setSaving(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Header &amp; Navbar
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Control the main website header — visibility, navigation items and
          actions. Changes go live immediately after saving.
        </p>
      </header>

      {/* Global toggles */}
      <div className={`${cardClass} mt-6 divide-y divide-neutral-100 admin-dark:divide-zinc-800`}>
        <Toggle
          label="Show Navbar"
          description="Hide the entire header from the live website."
          checked={config.showNavbar}
          onChange={(value) => setConfig((prev) => (prev ? { ...prev, showNavbar: value } : prev))}
        />
        <Toggle
          label="3-dot / Hamburger Menu"
          description="The dropdown menu that lists all navigation items."
          checked={config.showMoreMenu}
          onChange={(value) => setConfig((prev) => (prev ? { ...prev, showMoreMenu: value } : prev))}
        />
        <Toggle
          label="Dark / Light Mode Toggle"
          description="Theme switch button in the website header."
          checked={config.showThemeToggle}
          onChange={(value) => setConfig((prev) => (prev ? { ...prev, showThemeToggle: value } : prev))}
        />
        <Toggle
          label="Login Button"
          description="The Login / Dashboard button in the header."
          checked={config.showLoginButton}
          onChange={(value) => setConfig((prev) => (prev ? { ...prev, showLoginButton: value } : prev))}
        />
      </div>

      {/* Navigation items */}
      <div className={`${cardClass} mt-6`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
              Navigation Items
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 admin-dark:text-slate-400">
              Rename, re-link, reorder or hide individual items.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {config.items.map((item, index) => (
            <li
              key={item.key}
              className={`rounded-xl border border-neutral-200 bg-[#f8fbff] p-3 transition-colors duration-300 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]/60 ${
                item.isActive ? "" : "opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 admin-dark:bg-zinc-900">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${item.label} up`}
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-[#1a3a78] disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-zinc-300"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${item.label} down`}
                    onClick={() => moveItem(index, 1)}
                    disabled={index === config.items.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-[#1a3a78] disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-zinc-300"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.isActive}
                    aria-label={`Toggle ${item.label}`}
                    onClick={() => patchItem(item.key, { isActive: !item.isActive })}
                    className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition ${
                      item.isActive ? "bg-primary-600" : "bg-zinc-300 admin-dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        item.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</span>
                  <input
                    type="text"
                    value={item.label}
                    maxLength={100}
                    onChange={(event) => patchItem(item.key, { label: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">URL / Route</span>
                  <input
                    type="text"
                    value={item.href ?? ""}
                    placeholder="/courses or https://…"
                    maxLength={500}
                    onChange={(event) => patchItem(item.key, { href: event.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
              {!item.href && (
                <p className="mt-2 text-[11px] font-semibold text-amber-600 admin-dark:text-amber-400">
                  No URL set — this item shows a &quot;Soon&quot; badge in the menu.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

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

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          disabled={saving}
          className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold text-zinc-600 transition hover:bg-[#f8fbff] disabled:opacity-60 admin-dark:border-zinc-700 admin-dark:text-zinc-300 admin-dark:hover:bg-zinc-800"
        >
          Reset to Defaults
        </button>
      </div>

      <AdminConfirmDialog
        open={confirmReset}
        title="Reset header settings?"
        message="All navigation names, links, order and visibility will be restored to the MediSpark defaults."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          setConfig({ ...DEFAULT_NAVBAR_CONFIG, items: DEFAULT_NAVBAR_CONFIG.items.map((item) => ({ ...item })) });
          toast.showToast("info", "Unsaved defaults applied — press Save to publish.");
        }}
        onClose={() => setConfirmReset(false)}
      />
    </section>
  );
}
