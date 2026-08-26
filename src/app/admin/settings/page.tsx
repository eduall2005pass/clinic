"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

type SettingsForm = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  facebookUrl: string;
  youtubeUrl: string;
};

type SettingsResponse = {
  error?: string;
  message?: string;
  settings?: {
    siteName?: string;
    tagline?: string;
    contactEmail?: string;
    contactPhone?: string;
    facebookUrl?: string;
    youtubeUrl?: string;
  };
};

const EMPTY_FORM: SettingsForm = {
  siteName: "",
  tagline: "",
  contactEmail: "",
  contactPhone: "",
  facebookUrl: "",
  youtubeUrl: "",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60";

export default function GeneralSettingsPage() {
  const { user, authLoading } = useAuth();

  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");

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

  // Load current values from MySQL through the existing API
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/website-settings", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setInitialLoading(false);
          return;
        }
        const data = (await response.json()) as { settings?: Partial<SettingsForm> | null };
        if (cancelled) return;
        const s = data.settings;
        setForm({
          siteName: s?.siteName ?? "",
          tagline: s?.tagline ?? "",
          contactEmail: s?.contactEmail ?? "",
          contactPhone: s?.contactPhone ?? "",
          facebookUrl: s?.facebookUrl ?? "",
          youtubeUrl: s?.youtubeUrl ?? "",
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
    return <AccessLoading label="Loading website settings…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The general website settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  async function handleSave() {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("site_name", form.siteName.trim());
      formData.append("tagline", form.tagline.trim());
      formData.append("contact_email", form.contactEmail.trim());
      formData.append("contact_phone", form.contactPhone.trim());
      formData.append("facebook_url", form.facebookUrl.trim());
      formData.append("youtube_url", form.youtubeUrl.trim());

      const response = await fetch("/api/website-settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save website settings." });
        return;
      }
      // Sync form from canonical server response in case of server trimming
      if (data.settings) {
        setForm((prev) => ({
          siteName: data.settings?.siteName ?? prev.siteName,
          tagline: data.settings?.tagline ?? prev.tagline,
          contactEmail: data.settings?.contactEmail ?? prev.contactEmail,
          contactPhone: data.settings?.contactPhone ?? prev.contactPhone,
          facebookUrl: data.settings?.facebookUrl ?? prev.facebookUrl,
          youtubeUrl: data.settings?.youtubeUrl ?? prev.youtubeUrl,
        }));
      }
      setNotice({ kind: "success", text: "Website settings updated successfully. Changes are now live." });
    } catch {
      setNotice({ kind: "error", text: "Failed to save website settings." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">General Settings</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Manage your website name, tagline, contact details and social links.
            Changes are saved to MySQL and applied immediately across the live
            website. Only authorized administrators can update these settings.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {/* Website Identity */}
          <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
            <h2 className="text-lg font-bold text-heading">Website Identity</h2>
            <p className="mt-1 text-xs text-neutral-500">Basic branding that appears across the website.</p>

            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Website Name *</span>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => setForm((prev) => ({ ...prev, siteName: e.target.value }))}
                  placeholder="MediSpark"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Website Tagline</span>
                <textarea
                  value={form.tagline}
                  onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="HSC academic & medical admission preparation platform..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
            <h2 className="text-lg font-bold text-heading">Contact Information</h2>
            <p className="mt-1 text-xs text-neutral-500">Displayed in the footer and contact areas.</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Contact Email</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="support@medispark.com"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Contact Phone Number</span>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+880 1XXX-XXXXXX"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          {/* Social Links */}
          <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
            <h2 className="text-lg font-bold text-heading">Social Links</h2>
            <p className="mt-1 text-xs text-neutral-500">Links shown in the footer.</p>

            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Facebook Page URL</span>
                <input
                  type="url"
                  value={form.facebookUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))}
                  placeholder="https://facebook.com/medispark"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">YouTube Channel URL</span>
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/@medispark"
                  className={inputClass}
                />
              </label>
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
