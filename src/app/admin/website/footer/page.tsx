"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

type FooterLink = { label: string; href: string };

type FooterForm = {
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  facebookUrl: string;
  youtubeUrl: string;
  copyrightText: string;
  footerLinks: FooterLink[];
  showExplore: boolean;
  showPrograms: boolean;
  showContact: boolean;
};

const EMPTY_FORM: FooterForm = {
  tagline: "",
  contactEmail: "",
  contactPhone: "",
  facebookUrl: "",
  youtubeUrl: "",
  copyrightText: "",
  footerLinks: [],
  showExplore: true,
  showPrograms: true,
  showContact: true,
};

const inputClass =
  "mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60";

export default function FooterManagementPage() {
  const { user, authLoading } = useAuth();

  const [form, setForm] = useState<FooterForm>(EMPTY_FORM);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");

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
        if (cancelled) return;
        setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load current settings
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/website-settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          settings?: Partial<FooterForm> & {
            copyrightText?: string | null;
            footerLinks?: FooterLink[] | null;
          } | null;
        };
        if (cancelled || !data.settings) return;
        const s = data.settings;
        setForm({
          tagline: s.tagline ?? "",
          contactEmail: s.contactEmail ?? "",
          contactPhone: s.contactPhone ?? "",
          facebookUrl: s.facebookUrl ?? "",
          youtubeUrl: s.youtubeUrl ?? "",
          copyrightText: s.copyrightText ?? "",
          footerLinks: Array.isArray(s.footerLinks) ? s.footerLinks : [],
          showExplore: s.showExplore ?? true,
          showPrograms: s.showPrograms ?? true,
          showContact: s.showContact ?? true,
        });
      } catch {
        // Keep defaults
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || initialLoading) {
    return <AccessLoading label="Loading footer settings…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The footer settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  function updateLink(index: number, patch: Partial<FooterLink>) {
    setForm((prev) => ({
      ...prev,
      footerLinks: prev.footerLinks.map((link, i) =>
        i === index ? { ...link, ...patch } : link,
      ),
    }));
  }

  function moveLink(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const next = [...prev.footerLinks];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, footerLinks: next };
    });
  }

  async function handleSave() {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("tagline", form.tagline.trim());
      formData.append("contact_email", form.contactEmail.trim());
      formData.append("contact_phone", form.contactPhone.trim());
      formData.append("facebook_url", form.facebookUrl.trim());
      formData.append("youtube_url", form.youtubeUrl.trim());
      formData.append("copyright_text", form.copyrightText.trim());
      formData.append(
        "footer_links",
        JSON.stringify(
          form.footerLinks.map((link) => ({
            label: link.label.trim(),
            href: link.href.trim(),
          })),
        ),
      );
      formData.append("show_explore", String(form.showExplore));
      formData.append("show_programs", String(form.showPrograms));
      formData.append("show_contact", String(form.showContact));

      const response = await fetch("/api/website-settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data.error ?? "Failed to save the footer settings.",
        });
        return;
      }
      setNotice({
        kind: "success",
        text: "Footer saved. Changes are now live on the website.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the footer settings." });
    } finally {
      setBusy(false);
    }
  }

  function toggleField(field: "showExplore" | "showPrograms" | "showContact", label: string, hint: string) {
    const value = form[field];
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/10 bg-dark-850 px-4 py-3.5">
        <span>
          <span className="block text-sm font-semibold text-heading">{label}</span>
          <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>
        </span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, [field]: e.target.checked }))
          }
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
            value ? "bg-primary-600" : "bg-zinc-600"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
              value ? "left-[1.375rem]" : "left-0.5"
            }`}
          />
        </span>
      </label>
    );
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">Footer</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Manage the website footer — description, contact information,
            social links, custom links, copyright text and column visibility.
            Changes are saved to MySQL and go live immediately.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {/* Description */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Footer Description</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Short text shown under the logo in the footer.
            </p>
            <label className="mt-5 block">
              <textarea
                value={form.tagline}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tagline: e.target.value }))
                }
                rows={3}
                placeholder="HSC academic & medical admission preparation platform..."
                className={`${inputClass} resize-none`}
              />
            </label>
          </section>

          {/* Contact information */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Contact Information</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Contact Email</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  placeholder="support@medispark.com"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Contact Phone Number</span>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  placeholder="+880 1XXX-XXXXXX"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          {/* Social links */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Social Links</h2>
            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Facebook Page URL</span>
                <input
                  type="url"
                  value={form.facebookUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))
                  }
                  placeholder="https://facebook.com/medispark"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">YouTube Channel URL</span>
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                  }
                  placeholder="https://youtube.com/@medispark"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          {/* Footer links */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Footer Links</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Links shown in the Explore column. If empty, the main navigation
              links are used automatically.
            </p>

            <div className="mt-5 space-y-3">
              {form.footerLinks.map((link, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-xl border border-ink/10 bg-dark-850 p-3">
                  <label className="block min-w-0 flex-[2]">
                    <span className="text-xs font-semibold text-neutral-500">Label</span>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(index, { label: e.target.value })}
                      placeholder="Courses"
                      className={inputClass}
                    />
                  </label>
                  <label className="block min-w-0 flex-[3]">
                    <span className="text-xs font-semibold text-neutral-500">Link</span>
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => updateLink(index, { href: e.target.value })}
                      placeholder="/courses or https://..."
                      className={inputClass}
                    />
                  </label>
                  <div className="flex shrink-0 gap-1 pb-1">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-primary-500/60 hover:text-heading disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === form.footerLinks.length - 1}
                      aria-label="Move down"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-primary-500/60 hover:text-heading disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          footerLinks: prev.footerLinks.filter((_, i) => i !== index),
                        }))
                      }
                      aria-label="Remove link"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/40 text-red-400 transition hover:bg-red-500/10"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {form.footerLinks.length < 20 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      footerLinks: [...prev.footerLinks, { label: "", href: "" }],
                    }))
                  }
                  className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
                >
                  + Add Link
                </button>
              )}
            </div>
          </section>

          {/* Copyright */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Copyright Text</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Shown at the very bottom of the website. Leave empty to use the
              default “© YEAR MediSpark. All rights reserved.”
            </p>
            <label className="mt-5 block">
              <input
                type="text"
                value={form.copyrightText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, copyrightText: e.target.value }))
                }
                placeholder="© 2026 MediSpark. All rights reserved."
                className={inputClass}
              />
            </label>
          </section>

          {/* Visibility */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Section Visibility</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Show or hide individual footer columns.
            </p>
            <div className="mt-5 space-y-3">
              {toggleField("showExplore", "Explore links column", "The list of footer/navigation links.")}
              {toggleField("showPrograms", "Programs column", "HSC Academic, Medical Admission and more.")}
              {toggleField("showContact", "Contact column", "Contact details and social links.")}
            </div>
          </section>

          {notice && (
            <p
              className={
                notice.kind === "success"
                  ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
                  : "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              }
              role="status"
            >
              {notice.text}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </section>
    </main>
  );
}
