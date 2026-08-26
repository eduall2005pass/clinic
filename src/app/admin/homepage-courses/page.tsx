"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import type { HomepageCourseCard, HomepageCourseSlug } from "@/lib/homepage-courses-constants";
import { HOMEPAGE_COURSE_SLUGS } from "@/lib/homepage-courses-constants";

type Notice = { kind: "success" | "error"; text: string };

type CardForm = {
  slug: HomepageCourseSlug;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  isActive: boolean;
  imageUrl: string | null;
  imageFileName: string | null;
};

function slugLabel(slug: HomepageCourseSlug): string {
  if (slug === "ssc") return "SSC Academic Courses";
  if (slug === "hsc") return "HSC Academic Courses";
  return "Medical Admission Courses";
}

function slugBadgeColor(slug: HomepageCourseSlug): string {
  if (slug === "ssc") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (slug === "hsc") return "bg-sky-500/10 text-sky-400 border-sky-500/30";
  return "bg-rose-500/10 text-rose-400 border-rose-500/30";
}

export default function HomepageCoursesAdminPage() {
  const { user, authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardForm[]>([]);
  const [fileBySlug, setFileBySlug] = useState<Record<string, File | null>>({});
  const [previewBySlug, setPreviewBySlug] = useState<Record<string, string | null>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [noticeBySlug, setNoticeBySlug] = useState<Record<string, Notice | null>>({});
  const [globalNotice, setGlobalNotice] = useState<Notice | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Load cards
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/homepage-courses", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = (await res.json()) as { cards?: HomepageCourseCard[] };
        if (cancelled) return;
        const list = (data.cards ?? []).map((c) => ({
          slug: c.slug,
          title: c.title,
          description: c.description,
          buttonText: c.buttonText,
          buttonHref: c.buttonHref,
          isActive: c.isActive,
          imageUrl: c.imageUrl,
          imageFileName: c.imageFileName,
        }));
        // Ensure order ssc, hsc, medical
        const sorted = HOMEPAGE_COURSE_SLUGS.map((slug) => {
          const found = list.find((x) => x.slug === slug);
          if (found) return found;
          return {
            slug,
            title: slugLabel(slug),
            description: "",
            buttonText: "Explore Courses",
            buttonHref: "/courses",
            isActive: true,
            imageUrl: null,
            imageFileName: null,
          } as CardForm;
        });
        setCards(sorted);
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // cleanup object URLs
  useEffect(() => {
    return () => {
      Object.values(previewBySlug).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewBySlug]);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || loading) {
    return <AccessLoading label="Loading homepage courses…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Homepage Courses management is restricted to authorized administrators."
        actionLabel="Back to Home"
        actionHref="/"
      />
    );
  }

  function updateCard(slug: HomepageCourseSlug, patch: Partial<CardForm>) {
    setCards((prev) => prev.map((c) => (c.slug === slug ? { ...c, ...patch } : c)));
  }

  function handleFileChange(slug: HomepageCourseSlug, file: File | undefined) {
    setNoticeBySlug((prev) => ({ ...prev, [slug]: null }));
    setGlobalNotice(null);
    if (!file) {
      const prevUrl = previewBySlug[slug];
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      setFileBySlug((prev) => ({ ...prev, [slug]: null }));
      setPreviewBySlug((prev) => ({ ...prev, [slug]: null }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNoticeBySlug((prev) => ({
        ...prev,
        [slug]: { kind: "error", text: "Image is too large. Maximum size is 5 MB." },
      }));
      return;
    }
    const prevUrl = previewBySlug[slug];
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    setFileBySlug((prev) => ({ ...prev, [slug]: file }));
    setPreviewBySlug((prev) => ({ ...prev, [slug]: URL.createObjectURL(file) }));
  }

  async function handleSave(slug: HomepageCourseSlug) {
    if (!user) return;
    const card = cards.find((c) => c.slug === slug);
    if (!card) return;
    setBusySlug(slug);
    setNoticeBySlug((prev) => ({ ...prev, [slug]: null }));
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("slug", card.slug);
      formData.append("title", card.title.trim());
      formData.append("description", card.description.trim());
      formData.append("button_text", card.buttonText.trim());
      formData.append("button_href", card.buttonHref.trim());
      formData.append("is_active", card.isActive ? "true" : "false");
      const file = fileBySlug[slug];
      if (file) formData.append("image", file);

      const response = await fetch("/api/homepage-courses", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as { error?: string; card?: HomepageCourseCard };
      if (!response.ok) {
        setNoticeBySlug((prev) => ({
          ...prev,
          [slug]: { kind: "error", text: data.error ?? "Failed to save card." },
        }));
        return;
      }
      if (data.card) {
        updateCard(slug, {
          title: data.card.title,
          description: data.card.description,
          buttonText: data.card.buttonText,
          buttonHref: data.card.buttonHref,
          isActive: data.card.isActive,
          imageUrl: data.card.imageUrl,
          imageFileName: data.card.imageFileName,
        });
        // clear file selection
        const prevUrl = previewBySlug[slug];
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        setFileBySlug((prev) => ({ ...prev, [slug]: null }));
        setPreviewBySlug((prev) => ({ ...prev, [slug]: null }));
        const ref = inputRefs.current[slug];
        if (ref) ref.value = "";
      }
      setNoticeBySlug((prev) => ({
        ...prev,
        [slug]: { kind: "success", text: "Card updated successfully. Homepage will show updated content automatically." },
      }));
    } catch {
      setNoticeBySlug((prev) => ({
        ...prev,
        [slug]: { kind: "error", text: "Failed to save card." },
      }));
    } finally {
      setBusySlug(null);
    }
  }

  async function handleRemoveImage(slug: HomepageCourseSlug) {
    if (!user) return;
    setBusySlug(slug);
    setNoticeBySlug((prev) => ({ ...prev, [slug]: null }));
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/homepage-courses?slug=${slug}&target=image`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { error?: string; card?: HomepageCourseCard };
      if (!response.ok) {
        setNoticeBySlug((prev) => ({
          ...prev,
          [slug]: { kind: "error", text: data.error ?? "Failed to remove image." },
        }));
        return;
      }
      updateCard(slug, {
        imageUrl: null,
        imageFileName: null,
      });
      const prevUrl = previewBySlug[slug];
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      setFileBySlug((prev) => ({ ...prev, [slug]: null }));
      setPreviewBySlug((prev) => ({ ...prev, [slug]: null }));
      const ref = inputRefs.current[slug];
      if (ref) ref.value = "";
      setNoticeBySlug((prev) => ({
        ...prev,
        [slug]: { kind: "success", text: "Image removed successfully." },
      }));
    } catch {
      setNoticeBySlug((prev) => ({
        ...prev,
        [slug]: { kind: "error", text: "Failed to remove image." },
      }));
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">Admin Panel — Homepage</p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">Homepage Courses</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Manage the 3 category cards shown on the main website Homepage. Changes are saved to MySQL and appear
            automatically on the Homepage. Only authorized administrators can update these cards. This is not part of the
            Academic Panel.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] px-3 py-1 text-xs font-semibold text-neutral-500">
              3 fixed categories: SSC · HSC · Medical
            </span>
            <span className="rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-400">
              MySQL • Local uploads
            </span>
          </div>
        </header>

        {globalNotice && (
          <p
            className={
              globalNotice.kind === "success"
                ? "mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
                : "mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            }
            role="status"
          >
            {globalNotice.text}
          </p>
        )}

        <div className="mt-8 space-y-6">
          {cards.map((card) => {
            const previewUrl = previewBySlug[card.slug];
            const displayImage = previewUrl ?? card.imageUrl;
            const notice = noticeBySlug[card.slug];
            const isBusy = busySlug === card.slug;

            return (
              <section key={card.slug} className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${slugBadgeColor(card.slug)}`}>
                      {card.slug.toUpperCase()}
                    </span>
                    <h2 className="text-base font-bold text-heading">{slugLabel(card.slug)}</h2>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3">
                    <span className="text-xs font-semibold text-neutral-500">Active</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={card.isActive}
                      onClick={() => updateCard(card.slug, { isActive: !card.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        card.isActive ? "bg-primary-600" : "bg-ink/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          card.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-semibold ${card.isActive ? "text-emerald-400" : "text-neutral-500"}`}>
                      {card.isActive ? "Visible on Homepage" : "Hidden"}
                    </span>
                  </label>
                </div>

                <div className="p-6">
                  {/* Image */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-neutral-500">Card Image</p>
                    <div className="mt-2 flex min-h-44 items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
                      {displayImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayImage}
                          alt={`${card.title} preview`}
                          className="h-44 w-full object-cover sm:h-56"
                        />
                      ) : (
                        <span className="px-6 py-10 text-center text-sm text-neutral-500">
                          No image uploaded yet. Upload an image to display on the Homepage card.
                        </span>
                      )}
                    </div>
                    {card.imageFileName && !previewUrl && (
                      <p className="mt-2 text-center font-mono text-xs text-neutral-500">{card.imageFileName}</p>
                    )}
                    {previewUrl && fileBySlug[card.slug] && (
                      <p className="mt-2 text-center font-mono text-xs text-neutral-500">
                        Preview — {fileBySlug[card.slug]?.name} • {((fileBySlug[card.slug]?.size ?? 0) / 1024).toFixed(1)} KB
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer rounded-xl border border-dashed border-ink/20 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-primary-500/50 hover:text-heading">
                        {fileBySlug[card.slug] ? fileBySlug[card.slug]?.name : "Choose image"}
                        <input
                          ref={(el) => {
                            inputRefs.current[card.slug] = el;
                          }}
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                          className="sr-only"
                          onChange={(e) => handleFileChange(card.slug, e.target.files?.[0])}
                        />
                      </label>
                      {fileBySlug[card.slug] && (
                        <button
                          type="button"
                          onClick={() => handleFileChange(card.slug, undefined)}
                          className="text-sm font-semibold text-neutral-500 transition hover:text-heading"
                        >
                          Clear
                        </button>
                      )}
                      {card.imageUrl && !fileBySlug[card.slug] && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(card.slug)}
                          disabled={isBusy}
                          className="text-sm font-semibold text-red-400 transition hover:text-red-300 disabled:opacity-50"
                        >
                          {isBusy ? "Removing…" : "Remove image"}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">PNG, JPG, WebP, GIF or SVG — max 5 MB. Recommended 600×400.</p>
                  </div>

                  <div className="grid gap-5">
                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-500">Title *</span>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => updateCard(card.slug, { title: e.target.value })}
                        placeholder={slugLabel(card.slug)}
                        maxLength={255}
                        className="mt-1 w-full rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-500">Short Description *</span>
                      <textarea
                        value={card.description}
                        onChange={(e) => updateCard(card.slug, { description: e.target.value })}
                        placeholder="Short description shown on the Homepage card..."
                        rows={3}
                        maxLength={1000}
                        className="mt-1 w-full resize-none rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60"
                      />
                      <span className="mt-1 block text-right text-xs text-neutral-600">{card.description.length}/1000</span>
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-neutral-500">Button Text *</span>
                        <input
                          type="text"
                          value={card.buttonText}
                          onChange={(e) => updateCard(card.slug, { buttonText: e.target.value })}
                          placeholder="Explore Courses"
                          maxLength={100}
                          className="mt-1 w-full rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-neutral-500">Button Link *</span>
                        <input
                          type="text"
                          value={card.buttonHref}
                          onChange={(e) => updateCard(card.slug, { buttonHref: e.target.value })}
                          placeholder="/courses?category=ssc"
                          className="mt-1 w-full rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60"
                        />
                        <span className="mt-1 block text-xs text-neutral-600">Use /courses or https:// link</span>
                      </label>
                    </div>
                  </div>

                  {notice && (
                    <p
                      className={
                        notice.kind === "success"
                          ? "mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400"
                          : "mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
                      }
                      role="status"
                    >
                      {notice.text}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSave(card.slug)}
                    disabled={isBusy}
                    className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isBusy ? "Saving…" : `Save ${slugLabel(card.slug)}`}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
