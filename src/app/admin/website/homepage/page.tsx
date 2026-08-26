"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import {
  getSectionConfig,
  type HomepageSection,
  type HomepageSectionKey,
} from "@/lib/homepage-sections-constants";

export default function HomepageManagementPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<HomepageSection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
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

  // Load sections
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/homepage-sections", { cache: "no-store" });
        const data = (await res.json()) as { sections?: HomepageSection[] };
        if (!cancelled && data.sections) setSections(data.sections);
        else if (!cancelled)
          setNotice({ kind: "error", text: "Failed to load homepage settings." });
      } catch {
        if (!cancelled) setNotice({ kind: "error", text: "Failed to load homepage settings." });
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
    return <AccessLoading label="Loading homepage settings…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Homepage management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!sections) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load homepage settings. Please refresh the page.
        </p>
      </section>
    );
  }

  function patchSection(key: HomepageSectionKey, patch: Partial<HomepageSection>) {
    setSections((prev) =>
      prev
        ? prev.map((section) =>
            section.key === key ? { ...section, ...patch } : section,
          )
        : prev,
    );
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((prev) => {
      if (!prev) return prev;
      const items = [...prev];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }

  async function handleSave() {
    if (!user || !sections) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/homepage-sections", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sections }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save homepage settings." });
        toast.showToast("error", data.error ?? "Failed to save homepage settings.");
        return;
      }
      setNotice({ kind: "success", text: "Homepage settings saved. Live website updated." });
      toast.showToast("success", "Homepage settings saved. Live website updated.");
    } catch {
      setNotice({ kind: "error", text: "Failed to save homepage settings." });
      toast.showToast("error", "Failed to save homepage settings.");
    } finally {
      setSaving(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100 disabled:opacity-60";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Homepage
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Control which sections appear on the main website homepage, their
          order and their heading text. Changes go live immediately after
          saving.
        </p>
      </header>

      {/* Sections */}
      <ul className="mt-6 space-y-3">
        {sections.map((section, index) => {
          const config = getSectionConfig(section.key);
          return (
            <li
              key={section.key}
              className={`${cardClass} ${section.isActive ? "" : "opacity-70"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-[#f1f5f9] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 admin-dark:bg-[#132a4f]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
                  {section.label}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${section.label} up`}
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-[#1a3a78] disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-zinc-300"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${section.label} down`}
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-[#1a3a78] disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-zinc-300"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={section.isActive}
                    aria-label={`Toggle ${section.label}`}
                    onClick={() =>
                      patchSection(section.key, { isActive: !section.isActive })
                    }
                    className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition ${
                      section.isActive
                        ? "bg-primary-600"
                        : "bg-zinc-300 admin-dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        section.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {config.editableText ? (
                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Section Title
                    </span>
                    <input
                      type="text"
                      value={section.title ?? ""}
                      maxLength={255}
                      placeholder={config.defaultTitle}
                      onChange={(event) =>
                        patchSection(section.key, { title: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Section Description
                    </span>
                    <textarea
                      value={section.description ?? ""}
                      rows={2}
                      maxLength={1000}
                      placeholder={config.defaultDescription}
                      onChange={(event) =>
                        patchSection(section.key, { description: event.target.value })
                      }
                      className={`${inputClass} resize-none`}
                    />
                  </label>
                </div>
              ) : (
                <p className="mt-3 text-[11px] font-semibold text-slate-500">
                  Visibility and order only — content is managed separately.
                </p>
              )}
            </li>
          );
        })}
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
        title="Reset homepage settings?"
        message="All section titles, descriptions, order and visibility will be restored to the MediSpark defaults."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          setSections(
            sections.map((section) => {
              const config = getSectionConfig(section.key);
              return {
                key: section.key,
                label: section.label,
                title: config.editableText ? config.defaultTitle : null,
                description: config.editableText
                  ? config.defaultDescription
                  : null,
                isActive: true,
              };
            }),
          );
          toast.showToast("info", "Unsaved defaults applied — press Save to publish.");
        }}
        onClose={() => setConfirmReset(false)}
      />
    </section>
  );
}
