"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { getSocialPlatformIcon } from "@/components/social-icons";
import type { SocialLink, SocialPlatformKey } from "@/lib/social-links-constants";

/**
 * Website Information — Premium Navy Blue Smart Theme
 * One consolidated settings page with separate cards for:
 *   Branding, Contact Information, Social Links, SEO and Footer.
 *
 * Data reuses the existing MySQL-backed APIs (website-settings, logo,
 * social-links, seo-settings) so every saved value reflects on the Main
 * Website immediately without duplicating or moving any table.
 */

type OthersLink = { label: string; href: string };

const PLATFORMS: SocialPlatformKey[] = [
  "facebook",
  "youtube",
  "telegram",
  "instagram",
  "linkedin",
];

const PLATFORM_LABEL: Record<SocialPlatformKey, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  telegram: "Telegram",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const cardClass =
  "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 p-5 sm:p-6 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";
const cardTitleClass =
  "text-lg font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white";
const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3.5 py-2.5 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100 admin-dark:focus:bg-[#112544]";
const labelClass =
  "block text-[11px] font-bold uppercase tracking-wider text-slate-400 admin-dark:text-slate-500";

function waNumberToHref(number: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function hrefToWaNumber(href: string | undefined | null): string {
  if (!href) return "";
  const match = href.match(/wa\.me\/([\d]+)/);
  return match ? match[1] : "";
}

export default function WebsiteInformationPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [copyrightText, setCopyrightText] = useState("");

  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconName, setFaviconName] = useState<string | null>(null);

  const [links, setLinks] = useState<SocialLink[]>([]);

  const [siteTitle, setSiteTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [preservedSeo, setPreservedSeo] = useState({
    keywords: "",
    ogTitle: "",
    ogDescription: "",
  });

  const [otherContactLinks, setOtherContactLinks] = useState<OthersLink[]>([]);

  const [uploading, setUploading] = useState<"light" | "dark" | "favicon" | "og-image" | null>(null);
  const logoLightRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const ogImageRef = useRef<HTMLInputElement>(null);

  async function token(): Promise<string> {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const tokenId = await token();
        const [settingsRes, logoRes, seoRes, socialRes] = await Promise.all([
          fetch("/api/website-settings", { cache: "no-store" }),
          fetch("/api/logo", { cache: "no-store" }),
          fetch("/api/seo-settings", { cache: "no-store" }),
          fetch("/api/social-links?all=1", {
            cache: "no-store",
            headers: { Authorization: `Bearer ${tokenId}` },
          }),
        ]);

        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as {
            settings?: Record<string, unknown>;
          };
          const s = data.settings ?? {};
          setSiteName((s.siteName as string) ?? "");
          setTagline((s.tagline as string) ?? "");
          setContactEmail((s.contactEmail as string) ?? "");
          setContactPhone((s.contactPhone as string) ?? "");
          setAddress((s.address as string) ?? "");
          setCopyrightText((s.copyrightText as string) ?? "");
          setFaviconUrl((s.faviconUrl as string | null) ?? null);
          setFaviconName((s.faviconFileName as string | null) ?? null);
          const others = (s.otherContactLinks as OthersLink[] | null) ?? [];
          setOtherContactLinks(others);
          const waEntry = others.find((l) => l.label === "WhatsApp");
          setWhatsapp(hrefToWaNumber(waEntry?.href));
        }

        if (logoRes.ok) {
          const data = (await logoRes.json()) as {
            logo?: { url?: string };
            light?: { url?: string } | null;
            dark?: { url?: string } | null;
          };
          setLogoLight(data.light?.url ?? data.logo?.url ?? null);
          setLogoDark(data.dark?.url ?? data.logo?.url ?? null);
        }

        if (seoRes.ok) {
          const data = (await seoRes.json()) as {
            seo?: {
              siteTitle?: string;
              metaDescription?: string;
              ogImageUrl?: string;
              keywords?: string;
              ogTitle?: string;
              ogDescription?: string;
            };
          };
          const seo = data.seo ?? {};
          setSiteTitle(seo.siteTitle ?? "");
          setMetaDescription(seo.metaDescription ?? "");
          setOgImageUrl(seo.ogImageUrl ?? "");
          setPreservedSeo({
            keywords: seo.keywords ?? "",
            ogTitle: seo.ogTitle ?? "",
            ogDescription: seo.ogDescription ?? "",
          });
        }

        if (socialRes.ok) {
          const data = (await socialRes.json()) as { links?: SocialLink[] };
          const loaded = data.links ?? [];
          const mapped = PLATFORMS.map((key) => {
            const found = loaded.find((l) => l.key === key);
            return (
              found ?? {
                key,
                label: PLATFORM_LABEL[key],
                url: null,
                isActive: false,
              }
            );
          });
          setLinks(mapped);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const mergedOtherLinks = useMemo<OthersLink[]>(() => {
    const withoutWa = otherContactLinks.filter((l) => l.label !== "WhatsApp");
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length > 0) {
      withoutWa.push({ label: "WhatsApp", href: waNumberToHref(digits) });
    }
    return withoutWa;
  }, [otherContactLinks, whatsapp]);

  // ── Logo uploads (saved immediately, like the live logo pipeline) ────────
  async function uploadLogo(file: File, mode: "light" | "dark") {
    if (!file) return;
    setUploading(mode);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("mode", mode);
      const res = await fetch("/api/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}` },
        body: formData,
      });
      const data = (await res.json()) as { error?: string; logo?: { url?: string } };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Logo upload failed.");
        return;
      }
      if (data.logo?.url) {
        if (mode === "light") setLogoLight(data.logo.url);
        else setLogoDark(data.logo.url);
        toast.showToast(
          "success",
          `${mode === "light" ? "Light Mode" : "Dark Mode"} logo saved — live everywhere.`,
        );
      }
    } catch {
      toast.showToast("error", "Logo upload failed.");
    } finally {
      setUploading(null);
      if (mode === "light" && logoLightRef.current) logoLightRef.current.value = "";
      if (mode === "dark" && logoDarkRef.current) logoDarkRef.current.value = "";
    }
  }

  // ── Favicon upload (POST website-settings with just the file) ────────────
  async function uploadFavicon(file: File) {
    if (!file) return;
    setUploading("favicon");
    try {
      const formData = new FormData();
      formData.append("favicon", file);
      const res = await fetch("/api/website-settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}` },
        body: formData,
      });
      const data = (await res.json()) as {
        error?: string;
        settings?: { faviconUrl?: string | null; faviconFileName?: string | null };
      };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Favicon upload failed.");
        return;
      }
      if (data.settings) {
        setFaviconUrl(data.settings.faviconUrl ?? null);
        setFaviconName(data.settings.faviconFileName ?? null);
        toast.showToast("success", "Favicon saved — shown in the browser tab.");
      }
    } catch {
      toast.showToast("error", "Favicon upload failed.");
    } finally {
      setUploading(null);
      if (faviconRef.current) faviconRef.current.value = "";
    }
  }

  async function removeFavicon() {
    try {
      const res = await fetch("/api/website-settings?target=favicon", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to remove favicon.");
        return;
      }
      setFaviconUrl(null);
      setFaviconName(null);
      toast.showToast("success", "Favicon removed.");
    } catch {
      toast.showToast("error", "Failed to remove favicon.");
    }
  }

  // ── Social sharing (OG) image upload ─────────────────────────────────────
  async function uploadOgImage(file: File) {
    if (!file) return;
    setUploading("og-image");
    try {
      const formData = new FormData();
      formData.append("ogImage", file);
      const res = await fetch("/api/seo-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${await token()}` },
        body: formData,
      });
      const data = (await res.json()) as { error?: string; seo?: { ogImageUrl?: string } };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Image upload failed.");
        return;
      }
      if (data.seo?.ogImageUrl) {
        setOgImageUrl(data.seo.ogImageUrl);
        toast.showToast("success", "Social sharing image saved.");
      }
    } catch {
      toast.showToast("error", "Image upload failed.");
    } finally {
      setUploading(null);
      if (ogImageRef.current) ogImageRef.current.value = "";
    }
  }

  const saveAll = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const errors: string[] = [];

    // 1) Branding + Contact + Footer text (website-settings)
    try {
      const settingsRes = await fetch("/api/website-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify({
          siteName: siteName.trim(),
          tagline: tagline.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          address: address.trim(),
          copyrightText: copyrightText.trim(),
          otherContactLinks: mergedOtherLinks,
        }),
      });
      const settingsData = (await settingsRes.json()) as { error?: string };
      if (!settingsRes.ok) {
        errors.push(settingsData.error ?? "Failed to save website settings.");
      }
    } catch {
      errors.push("Failed to save website settings.");
    }

    // 2) Social links
    try {
      const socialRes = await fetch("/api/social-links", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify({
          links: links.map((link) => ({
            key: link.key,
            url: link.url?.trim() || null,
            isActive: link.isActive,
          })),
        }),
      });
      const socialData = (await socialRes.json()) as { error?: string };
      if (!socialRes.ok) {
        errors.push(socialData.error ?? "Failed to save social links.");
      }
    } catch {
      errors.push("Failed to save social links.");
    }

    // 3) SEO (meta title + description, preserving keywords/OG fields)
    try {
      const seoRes = await fetch("/api/seo-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify({
          siteTitle: siteTitle.trim(),
          metaDescription: metaDescription.trim(),
          keywords: preservedSeo.keywords,
          ogTitle: preservedSeo.ogTitle,
          ogDescription: preservedSeo.ogDescription,
          ogImageUrl,
        }),
      });
      const seoData = (await seoRes.json()) as { error?: string };
      if (!seoRes.ok) {
        errors.push(seoData.error ?? "Failed to save SEO settings.");
      }
    } catch {
      errors.push("Failed to save SEO settings.");
    }

    setSaving(false);

    if (errors.length > 0) {
      toast.showToast("error", errors[0]);
      return;
    }
    toast.showToast("success", "All Website Information saved — live on the Main Website.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, siteName, tagline, contactEmail, contactPhone, address, whatsapp, copyrightText, mergedOtherLinks, links, siteTitle, metaDescription, preservedSeo, ogImageUrl]);

  function patchLink(key: SocialPlatformKey, patch: Partial<SocialLink>) {
    setLinks((prev) =>
      prev.map((link) => (link.key === key ? { ...link, ...patch } : link)),
    );
  }

  if (authLoading || !user) {
    return <AccessLoading label="Loading Website Information…" />;
  }

  if (loading) {
    return <AccessLoading label="Loading Website Information…" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Website Information
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Manage the identity, contact details, social links, SEO and footer of
          the Main Website. Changes go live immediately after saving.
        </p>
      </header>

      {/* ── 1. Branding ─────────────────────────────────────────────────── */}
      <section id="branding" className={`${cardClass} mt-6`}>
        <h2 className={cardTitleClass}>Branding</h2>
        <p className="mt-1 text-xs text-slate-400 admin-dark:text-slate-500">
          Name, tagline and visual identity of the website.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Website Name</label>
            <input
              type="text"
              value={siteName}
              maxLength={100}
              onChange={(e) => setSiteName(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="MediSpark"
            />
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input
              type="text"
              value={tagline}
              maxLength={255}
              onChange={(e) => setTagline(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="Short description shown under the logo"
            />
          </div>
        </div>

        {/* Light / Dark logos + favicon */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {(
            [
              { mode: "light" as const, label: "Light Mode Logo", ref: logoLightRef, value: logoLight },
              { mode: "dark" as const, label: "Dark Mode Logo", ref: logoDarkRef, value: logoDark },
            ] as const
          ).map(({ mode, label, ref, value }) => (
            <div
              key={mode}
              className="rounded-xl border border-[#dbeafe] p-3.5 admin-dark:border-[#1e3a65]"
            >
              <label className={labelClass}>{label}</label>
              <div
                className="mt-2 flex h-16 items-center justify-center overflow-hidden rounded-lg border border-ink/10"
                style={{ backgroundColor: mode === "light" ? "#ffffff" : "#0a0a12" }}
              >
                {value ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={value}
                    alt={`${mode} logo`}
                    className="max-h-full max-w-full object-contain p-1"
                  />
                ) : (
                  <span className="px-2 text-center text-[10px] text-neutral-500">
                    No {mode} logo
                  </span>
                )}
              </div>
              <input
                ref={ref}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadLogo(file, mode);
                }}
                disabled={uploading !== null}
                className="mt-2 w-full cursor-pointer rounded-lg border border-ink/15 bg-[#f8fbff] px-2 py-1.5 text-[11px] text-neutral-300 outline-none file:mr-2 file:rounded-md file:border-0 file:bg-primary-600 file:px-2.5 file:py-1 file:text-[10px] file:font-bold file:text-white disabled:opacity-60 admin-dark:bg-[#0f2547]"
              />
            </div>
          ))}

          {/* Favicon */}
          <div className="rounded-xl border border-[#dbeafe] p-3.5 admin-dark:border-[#1e3a65]">
            <label className={labelClass}>Favicon</label>
            <div className="mt-2 flex h-16 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-white">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconUrl}
                  alt="favicon"
                  className="max-h-full max-w-full object-contain p-1.5"
                />
              ) : (
                <span className="px-2 text-center text-[10px] text-neutral-500">
                  Browser tab icon
                </span>
              )}
            </div>
            <input
              ref={faviconRef}
              type="file"
              accept=".ico,.png,.jpg,.jpeg,.webp,.gif,.svg,image/x-icon,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFavicon(file);
              }}
              disabled={uploading !== null}
              className="mt-2 w-full cursor-pointer rounded-lg border border-ink/15 bg-[#f8fbff] px-2 py-1.5 text-[11px] text-neutral-300 outline-none file:mr-2 file:rounded-md file:border-0 file:bg-primary-600 file:px-2.5 file:py-1 file:text-[10px] file:font-bold file:text-white disabled:opacity-60 admin-dark:bg-[#0f2547]"
            />
            {faviconName && (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-slate-400">{faviconName}</span>
                <button
                  type="button"
                  onClick={() => void removeFavicon()}
                  className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500 transition hover:bg-red-500/20"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. Contact Information ──────────────────────────────────────── */}
      <section id="contact" className={`${cardClass} mt-6`}>
        <h2 className={cardTitleClass}>Contact Information</h2>
        <p className="mt-1 text-xs text-slate-400 admin-dark:text-slate-500">
          Shown in the website footer Contact column.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="support@medispark.com"
            />
          </div>
          <div>
            <label className={labelClass}>Support Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="+880 1XXX-XXXXXX"
            />
          </div>
          <div>
            <label className={labelClass}>WhatsApp Number</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="+880 1XXX-XXXXXX"
            />
            <p className="mt-1 text-[10px] text-slate-400 admin-dark:text-slate-500">
              Opens a chat at wa.me. Saves as a WhatsApp link in the footer.
            </p>
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={address}
              maxLength={500}
              onChange={(e) => setAddress(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="Street, City, Country"
            />
          </div>
        </div>
      </section>

      {/* ── 3. Social Links ─────────────────────────────────────────────── */}
      <section id="social" className={`${cardClass} mt-6`}>
        <h2 className={cardTitleClass}>Social Links</h2>
        <p className="mt-1 text-xs text-slate-400 admin-dark:text-slate-500">
          Links for the “Join With Us Now !!” section and the footer. Each can be enabled or disabled.
        </p>
        <ul className="mt-5 space-y-3">
          {links.map((link) => {
            const icon = getSocialPlatformIcon(link.key);
            return (
              <li
                key={link.key}
                className={`rounded-xl border border-[#dbeafe] p-4 admin-dark:border-[#1e3a65] ${
                  link.isActive ? "" : "opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 admin-dark:text-primary-400">
                    {icon ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
                        <path d={icon} />
                      </svg>
                    ) : (
                      link.label.charAt(0)
                    )}
                  </span>
                  <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">
                    {link.label}
                  </h3>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={link.isActive}
                    aria-label={`Toggle ${link.label}`}
                    onClick={() => patchLink(link.key, { isActive: !link.isActive })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                      link.isActive ? "bg-primary-600" : "bg-zinc-300 admin-dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        link.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    URL
                  </span>
                  <input
                    type="url"
                    value={link.url ?? ""}
                    maxLength={1024}
                    placeholder={`https://${link.key}.com/medispark`}
                    onChange={(e) => patchLink(link.key, { url: e.target.value })}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                {!link.url && (
                  <p className="mt-2 text-[11px] font-semibold text-amber-600 admin-dark:text-amber-400">
                    No URL set — this platform will not appear even when enabled.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 4. SEO ──────────────────────────────────────────────────────── */}
      <section id="seo" className={`${cardClass} mt-6`}>
        <h2 className={cardTitleClass}>SEO</h2>
        <p className="mt-1 text-xs text-slate-400 admin-dark:text-slate-500">
          Search engine + social sharing metadata.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Meta Title</label>
            <input
              type="text"
              value={siteTitle}
              maxLength={255}
              onChange={(e) => setSiteTitle(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="Site title shown in browser tabs & search results"
            />
          </div>
          <div>
            <label className={labelClass}>Meta Description</label>
            <textarea
              value={metaDescription}
              maxLength={2000}
              rows={3}
              onChange={(e) => setMetaDescription(e.target.value)}
              className={`${inputClass} mt-1.5 resize-y`}
              placeholder="Short description for search engines"
            />
          </div>
          <div>
            <label className={labelClass}>Social Share Image</label>
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-ink/5 admin-dark:bg-[#0a162e]">
                {ogImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ogImageUrl}
                    alt="social share preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-2 text-center text-[11px] text-neutral-500">
                    No share image
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  ref={ogImageRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadOgImage(file);
                  }}
                  disabled={uploading !== null}
                  className="w-full cursor-pointer rounded-xl border border-ink/15 bg-[#f8fbff] px-3 py-2.5 text-xs text-neutral-300 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white disabled:opacity-60 admin-dark:bg-[#0f2547]"
                />
                <p className="mt-1.5 text-[11px] text-slate-400 admin-dark:text-slate-500">
                  Preview shown when the website is shared on social media.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Footer ───────────────────────────────────────────────────── */}
      <section id="footer" className={`${cardClass} mt-6`}>
        <h2 className={cardTitleClass}>Footer</h2>
        <p className="mt-1 text-xs text-slate-400 admin-dark:text-slate-500">
          Bottom section description and copyright line.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Footer Description</label>
            <textarea
              value={tagline}
              maxLength={255}
              rows={2}
              onChange={(e) => setTagline(e.target.value)}
              className={`${inputClass} mt-1.5 resize-y`}
              placeholder="Description shown under the footer logo"
            />
          </div>
          <div>
            <label className={labelClass}>Copyright Text</label>
            <input
              type="text"
              value={copyrightText}
              maxLength={255}
              onChange={(e) => setCopyrightText(e.target.value)}
              className={`${inputClass} mt-1.5`}
              placeholder="© 2026 MediSpark. All rights reserved."
            />
          </div>
        </div>
      </section>

      {/* ── Save Changes ────────────────────────────────────────────────── */}
      <div className="sticky bottom-4 z-10 mt-8 flex items-center justify-end gap-3 rounded-2xl border border-[#dbeafe] bg-white/90 p-4 shadow-lg shadow-[#0b1e3a]/10 backdrop-blur admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]/90">
        {uploading && (
          <p className="mr-auto text-xs font-semibold text-primary-500 admin-dark:text-primary-400">
            Uploading… {uploading}
          </p>
        )}
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving || uploading !== null}
          className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </section>
  );
}
