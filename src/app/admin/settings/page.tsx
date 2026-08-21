"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useLogo } from "@/components/LogoProvider";
import { MAX_LOGO_FILE_SIZE } from "@/lib/logo";
import { MAX_FAVICON_FILE_SIZE } from "@/lib/website-settings-constants";
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

type FaviconState = {
  url: string | null;
  fileName: string | null;
};

export default function WebsiteSettingsPage() {
  const { user, authLoading } = useAuth();
  const { logo, refresh: refreshLogo } = useLogo();

  const [form, setForm] = useState<SettingsForm>({
    siteName: "",
    tagline: "",
    contactEmail: "",
    contactPhone: "",
    facebookUrl: "",
    youtubeUrl: "",
  });
  const [favicon, setFavicon] = useState<FaviconState>({ url: null, fileName: null });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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
        if (!response.ok) {
          if (!cancelled) setInitialLoading(false);
          return;
        }
        const data = (await response.json()) as {
          settings?: {
            siteName?: string;
            tagline?: string;
            contactEmail?: string;
            contactPhone?: string;
            facebookUrl?: string;
            youtubeUrl?: string;
            faviconUrl?: string | null;
            faviconFileName?: string | null;
          };
        };
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
        setFavicon({
          url: s?.faviconUrl ?? null,
          fileName: s?.faviconFileName ?? null,
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

  // Revoke object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      if (faviconPreviewUrl) URL.revokeObjectURL(faviconPreviewUrl);
    };
  }, [logoPreviewUrl, faviconPreviewUrl]);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || initialLoading) {
    return <AccessLoading label="Loading website settings…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Website Settings is restricted to authorized administrators. Your account does not have permission to manage website settings."
        actionLabel="Back to Home"
        actionHref="/"
        secondaryLabel="Go to Dashboard"
        secondaryHref="/dashboard"
      />
    );
  }

  function handleLogoChange(file: File | undefined) {
    setNotice(null);
    if (!file) {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoFile(null);
      setLogoPreviewUrl(null);
      return;
    }
    if (file.size > MAX_LOGO_FILE_SIZE) {
      setNotice({ kind: "error", text: "Logo is too large. Maximum size is 5 MB." });
      return;
    }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  function handleFaviconChange(file: File | undefined) {
    setNotice(null);
    if (!file) {
      if (faviconPreviewUrl) URL.revokeObjectURL(faviconPreviewUrl);
      setFaviconFile(null);
      setFaviconPreviewUrl(null);
      return;
    }
    if (file.size > MAX_FAVICON_FILE_SIZE) {
      setNotice({ kind: "error", text: "Favicon is too large. Maximum size is 5 MB." });
      return;
    }
    if (faviconPreviewUrl) URL.revokeObjectURL(faviconPreviewUrl);
    setFaviconFile(file);
    setFaviconPreviewUrl(URL.createObjectURL(file));
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
      if (faviconFile) formData.append("favicon", faviconFile);
      if (logoFile) formData.append("logo", logoFile);

      const response = await fetch("/api/website-settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        settings?: {
          faviconUrl?: string | null;
          faviconFileName?: string | null;
          siteName?: string;
          tagline?: string;
          contactEmail?: string;
          contactPhone?: string;
          facebookUrl?: string;
          youtubeUrl?: string;
        };
      };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save website settings." });
        return;
      }
      // Update favicon display from response
      if (data.settings) {
        setFavicon({
          url: data.settings.faviconUrl ?? favicon?.url ?? null,
          fileName: data.settings.faviconFileName ?? favicon?.fileName ?? null,
        });
        // Also sync form from canonical response in case of server trimming
        setForm((prev) => ({
          siteName: data.settings?.siteName ?? prev.siteName,
          tagline: data.settings?.tagline ?? prev.tagline,
          contactEmail: data.settings?.contactEmail ?? prev.contactEmail,
          contactPhone: data.settings?.contactPhone ?? prev.contactPhone,
          facebookUrl: data.settings?.facebookUrl ?? prev.facebookUrl,
          youtubeUrl: data.settings?.youtubeUrl ?? prev.youtubeUrl,
        }));
      }
      // Clear file selections
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      if (faviconPreviewUrl) URL.revokeObjectURL(faviconPreviewUrl);
      setLogoFile(null);
      setLogoPreviewUrl(null);
      setFaviconFile(null);
      setFaviconPreviewUrl(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      if (faviconInputRef.current) faviconInputRef.current.value = "";
      // Refresh dynamic logo everywhere
      if (logoFile) await refreshLogo();
      setNotice({ kind: "success", text: "Website settings updated successfully." });
    } catch {
      setNotice({ kind: "error", text: "Failed to save website settings." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveFavicon() {
    if (!user || !favicon.url) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/website-settings?target=favicon", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to remove favicon." });
        return;
      }
      setFavicon({ url: null, fileName: null });
      if (faviconPreviewUrl) URL.revokeObjectURL(faviconPreviewUrl);
      setFaviconFile(null);
      setFaviconPreviewUrl(null);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
      setNotice({ kind: "success", text: "Website settings updated successfully." });
    } catch {
      setNotice({ kind: "error", text: "Failed to remove favicon." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website Settings
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">Website Settings</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Manage your website identity, contact details and social links. Changes are saved to MySQL and
            applied immediately across the website. Only authorized administrators can update these settings.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {/* Website Identity */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
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
                  className="mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Website Tagline</span>
                <textarea
                  value={form.tagline}
                  onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                  placeholder="HSC academic & medical admission preparation platform..."
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
                />
              </label>
            </div>
          </section>

          {/* Logo */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Website Logo</h2>
            <p className="mt-1 text-xs text-neutral-500">This is exactly what visitors see right now. Transparent PNG preferred.</p>

            <div className="mt-5 flex min-h-44 items-center justify-center rounded-xl bg-dark-850 p-6">
              <Image
                key={logoPreviewUrl ?? logo.url}
                src={logoPreviewUrl ?? logo.url}
                alt="Website logo"
                width={logo.width}
                height={logo.height}
                priority
                unoptimized={(logoPreviewUrl ?? logo.url).startsWith("/uploads/") || Boolean(logoPreviewUrl?.startsWith("blob:"))}
                className="max-h-40 w-auto object-contain"
              />
            </div>
            <p className="mt-2 text-center font-mono text-xs text-neutral-500">
              {logoPreviewUrl ? `Preview — ${logoFile?.name}` : `${logo.fileName} • ${logo.width} × ${logo.height}px`}
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/20 bg-dark-850 px-6 py-8 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5">
              <svg className="h-8 w-8 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              <span className="mt-3 text-sm font-semibold text-heading">
                {logoFile ? logoFile.name : "Click to choose a new logo"}
              </span>
              <span className="mt-1 text-xs text-neutral-500">PNG, JPG, WebP, GIF or SVG — max 5 MB</span>
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                onChange={(e) => handleLogoChange(e.target.files?.[0])}
              />
            </label>
            {logoFile && (
              <button
                type="button"
                onClick={() => handleLogoChange(undefined)}
                className="mt-3 text-sm font-semibold text-neutral-400 transition hover:text-heading"
              >
                Clear selection
              </button>
            )}
          </section>

          {/* Favicon */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Website Favicon</h2>
            <p className="mt-1 text-xs text-neutral-500">Small icon shown in browser tabs and bookmarks. ICO or PNG up to 5 MB — 32×32 or 512×512 recommended.</p>

            <div className="mt-5 flex items-center justify-center rounded-xl bg-dark-850 p-6">
              {/* eslint-disable @next/next/no-img-element */}
              {faviconPreviewUrl ? (
                <img src={faviconPreviewUrl} alt="Favicon preview" className="h-16 w-16 object-contain" />
              ) : favicon.url ? (
                <img src={favicon.url} alt="Current favicon" className="h-16 w-16 object-contain" />
              ) : (
                <span className="text-sm text-neutral-500">No favicon uploaded yet</span>
              )}
            </div>
            {favicon.fileName && !faviconPreviewUrl && (
              <p className="mt-2 text-center font-mono text-xs text-neutral-500">{favicon.fileName}</p>
            )}
            {faviconPreviewUrl && faviconFile && (
              <p className="mt-2 text-center font-mono text-xs text-neutral-500">
                Preview — {faviconFile.name} • {(faviconFile.size / 1024).toFixed(1)} KB
              </p>
            )}

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/20 bg-dark-850 px-6 py-8 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5">
              <svg className="h-8 w-8 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              <span className="mt-3 text-sm font-semibold text-heading">
                {faviconFile ? faviconFile.name : "Click to choose a favicon"}
              </span>
              <span className="mt-1 text-xs text-neutral-500">ICO, PNG, JPG, WebP, GIF or SVG — max 5 MB</span>
              <input
                ref={faviconInputRef}
                type="file"
                accept=".ico,.png,.jpg,.jpeg,.webp,.gif,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                onChange={(e) => handleFaviconChange(e.target.files?.[0])}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              {faviconFile && (
                <button
                  type="button"
                  onClick={() => handleFaviconChange(undefined)}
                  className="text-sm font-semibold text-neutral-400 transition hover:text-heading"
                >
                  Clear selection
                </button>
              )}
              {favicon.url && !faviconFile && (
                <button
                  type="button"
                  onClick={handleRemoveFavicon}
                  disabled={busy}
                  className="text-sm font-semibold text-red-400 transition hover:text-red-300 disabled:opacity-50"
                >
                  Remove favicon
                </button>
              )}
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
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
                  className="mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Contact Phone Number</span>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+880 1XXX-XXXXXX"
                  className="mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
                />
              </label>
            </div>
          </section>

          {/* Social Links */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Social Links</h2>
            <p className="mt-1 text-xs text-neutral-500">Links shown in the footer.</p>

            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Facebook Page Link</span>
                <input
                  type="url"
                  value={form.facebookUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))}
                  placeholder="https://facebook.com/medispark"
                  className="mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">YouTube Channel Link</span>
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/@medispark"
                  className="mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
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
