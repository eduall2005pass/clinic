"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

type SeoSettings = {
  siteTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60";

export default function SeoSettingsPage() {
  const { user, authLoading } = useAuth();

  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Load SEO settings
  useEffect(() => {
    if (authLoading || !user || adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/seo-settings", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { seo?: SeoSettings };
        if (data.seo && !cancelled) setSettings(data.seo);
      } catch {
        // Keep loading state cleared below
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, adminStatus]);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || initialLoading) {
    return <AccessLoading label="Loading SEO settings…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="SEO settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Admin"
        actionHref="/admin"
      />
    );
  }

  function patch(patchValues: Partial<SeoSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patchValues } : prev));
  }

  async function handleSave() {
    if (!user || !settings) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.set("siteTitle", settings.siteTitle);
      formData.set("metaDescription", settings.metaDescription);
      formData.set("keywords", settings.keywords);
      formData.set("ogTitle", settings.ogTitle);
      formData.set("ogDescription", settings.ogDescription);
      if (ogImageFile) formData.set("ogImage", ogImageFile);

      const response = await fetch("/api/seo-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        seo?: SeoSettings;
      } | null;
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to save the SEO settings.",
        });
        return;
      }
      if (data?.seo) setSettings(data.seo);
      setOgImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({
        kind: "success",
        text: "SEO settings saved. Changes are now live on the website.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the SEO settings." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveImage() {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/seo-settings?target=og-image", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        seo?: SeoSettings;
      } | null;
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to remove the social sharing image.",
        });
        return;
      }
      if (data?.seo) setSettings(data.seo);
      setOgImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({
        kind: "success",
        text: "Social sharing image removed.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to remove the social sharing image." });
    } finally {
      setBusy(false);
    }
  }

  const previewImageUrl = ogImageFile
    ? URL.createObjectURL(ogImageFile)
    : settings?.ogImageUrl || "";

  const previewTitle = settings?.ogTitle || settings?.siteTitle || "MediSpark — HSC Academic & Medical Admission Preparation";

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">
            SEO Settings
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Control how the website appears on search engines and when its
            pages are shared on social media. Leave a field empty to keep the
            built-in default.
          </p>
        </header>

        {!settings ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load the current SEO settings. Please refresh the page.
          </p>
        ) : (
          <>
            {/* Search engine basics */}
            <section className="mt-8 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Search Engine</h2>
              <p className="mt-1 text-xs text-neutral-500">
                The website title and description shown in Google/Bing search
                results and in the browser tab.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="seo-title" className="text-xs font-semibold text-neutral-500">
                    Website title
                  </label>
                  <input
                    id="seo-title"
                    type="text"
                    value={settings.siteTitle}
                    onChange={(e) => patch({ siteTitle: e.target.value })}
                    placeholder="MediSpark — HSC Academic & Medical Admission Preparation"
                    maxLength={255}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="seo-description" className="text-xs font-semibold text-neutral-500">
                    Meta description
                  </label>
                  <textarea
                    id="seo-description"
                    value={settings.metaDescription}
                    onChange={(e) => patch({ metaDescription: e.target.value })}
                    placeholder="Short summary of the website shown under the title in search results…"
                    rows={3}
                    maxLength={2000}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-neutral-600">
                    {settings.metaDescription.length} characters — around 150–160 shows best in search results.
                  </p>
                </div>

                <div>
                  <label htmlFor="seo-keywords" className="text-xs font-semibold text-neutral-500">
                    Keywords
                  </label>
                  <textarea
                    id="seo-keywords"
                    value={settings.keywords}
                    onChange={(e) => patch({ keywords: e.target.value })}
                    placeholder="medical admission, HSC preparation, biology, chemistry…"
                    rows={2}
                    maxLength={1000}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-neutral-600">Comma-separated keywords.</p>
                </div>
              </div>
            </section>

            {/* Open Graph */}
            <section className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Social Sharing (Open Graph)</h2>
              <p className="mt-1 text-xs text-neutral-500">
                How the website looks when shared on Facebook, WhatsApp,
                Messenger, X and other social platforms.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="og-title" className="text-xs font-semibold text-neutral-500">
                    Open Graph title
                  </label>
                  <input
                    id="og-title"
                    type="text"
                    value={settings.ogTitle}
                    onChange={(e) => patch({ ogTitle: e.target.value })}
                    placeholder={settings.siteTitle || "Falls back to the website title"}
                    maxLength={255}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="og-description" className="text-xs font-semibold text-neutral-500">
                    Open Graph description
                  </label>
                  <textarea
                    id="og-description"
                    value={settings.ogDescription}
                    onChange={(e) => patch({ ogDescription: e.target.value })}
                    placeholder={settings.metaDescription || "Falls back to the meta description"}
                    rows={3}
                    maxLength={2000}
                    className={inputClass}
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-neutral-500">
                    Social sharing image
                  </span>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    Recommended: 1200×630 PNG or JPG, up to 5 MB.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    {previewImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={previewImageUrl}
                        alt="Social sharing preview"
                        className="h-28 w-48 rounded-xl border border-ink/10 object-cover"
                      />
                    ) : (
                      <span className="flex h-28 w-48 items-center justify-center rounded-xl border border-dashed border-ink/20 text-xs text-neutral-600">
                        No image selected
                      </span>
                    )}
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => setOgImageFile(e.target.files?.[0] ?? null)}
                        aria-label="Upload social sharing image"
                        className="block w-full max-w-xs cursor-pointer rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-xs text-neutral-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-700"
                      />
                      {(settings.ogImageUrl || ogImageFile) && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={busy}
                          className="text-xs font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
                        >
                          Remove current image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Share preview */}
            <section className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Share Preview</h2>
              <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547]">
                {previewImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewImageUrl}
                    alt="Share preview"
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <p className="truncate text-sm font-semibold text-heading">
                    {previewTitle}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                    {settings.ogDescription ||
                      settings.metaDescription ||
                      "MediSpark is an HSC academic and medical admission preparation platform."}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-neutral-600">
                    bloodarenabd.tech
                  </p>
                </div>
              </div>
            </section>

            {notice && (
              <p
                className={
                  notice.kind === "success"
                    ? "mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
                    : "mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
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
              className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
