"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { bannerSlides, MAX_BANNER_FILE_SIZE } from "@/lib/banners";
import type { CustomBanner } from "@/lib/banner-store";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

type SlideState = {
  id: string;
  image: string;
  href: string;
  custom: boolean;
  busy: "save" | "remove" | null;
  notice: Notice | null;
};

export default function WebsiteSettingsPage() {
  const { user, authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");

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

  const adminCheck =
    !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking") {
    return <AccessLoading label="Checking administrator access…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The website banner settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">Hero Banners</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Customize the hero banner slider shown on the live website.
            Changes apply immediately. Logo &amp; Favicon are managed in their
            own section. Only authorized administrators can change these.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <HeroBannersSection />
        </div>
      </section>
    </main>
  );
}

function HeroBannersSection() {
  const [slides, setSlides] = useState<SlideState[]>(() =>
    bannerSlides.map((slide) => ({
      id: slide.id,
      image: slide.image,
      href: slide.href ?? "",
      custom: false,
      busy: null,
      notice: null,
    })),
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/banners", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { slides?: CustomBanner[] | null } | null) => {
        if (cancelled) return;
        const custom = data?.slides ?? [];
        if (custom.length === 0) return;
        const customById = new Map(custom.map((slide) => [slide.id, slide]));
        setSlides((current) =>
          current.map((slide) => {
            const override = customById.get(slide.id);
            if (!override) return slide;
            return {
              ...slide,
              image: override.url,
              href: override.href ?? "",
              custom: true,
            };
          }),
        );
      })
      .catch(() => {
        // Keep defaults when the API is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSlide(id: string, patch: Partial<SlideState>) {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)),
    );
  }

  async function handleSave(slide: SlideState, file: File) {
    if (file.size > MAX_BANNER_FILE_SIZE) {
      updateSlide(slide.id, {
        notice: {
          kind: "error",
          text: "File is too large. The banner must be 5 MB or smaller.",
        },
      });
      return;
    }
    updateSlide(slide.id, { busy: "save", notice: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("id", slide.id);
      formData.append("href", slide.href);
      const response = await fetch("/api/banners", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        slides?: CustomBanner[];
      };
      if (!response.ok) {
        updateSlide(slide.id, {
          notice: { kind: "error", text: data.error ?? "Failed to save the banner." },
        });
        return;
      }
      const saved = data.slides?.find((item) => item.id === slide.id);
      updateSlide(slide.id, {
        image: saved?.url ?? slide.image,
        custom: Boolean(saved),
        notice: {
          kind: "success",
          text: "Banner saved. It is now live on the homepage slider.",
        },
      });
    } catch {
      updateSlide(slide.id, {
        notice: { kind: "error", text: "Failed to save the banner." },
      });
    } finally {
      updateSlide(slide.id, { busy: null });
    }
  }

  async function handleRemove(slide: SlideState) {
    updateSlide(slide.id, { busy: "remove", notice: null });
    try {
      const response = await fetch("/api/banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: slide.id }),
      });
      if (!response.ok) {
        updateSlide(slide.id, {
          notice: { kind: "error", text: "Failed to remove the banner." },
        });
        return;
      }
      const fallback = bannerSlides.find((item) => item.id === slide.id);
      updateSlide(slide.id, {
        image: fallback?.image ?? slide.image,
        href: fallback?.href ?? "",
        custom: false,
        notice: {
          kind: "success",
          text: "Custom banner removed. The default banner is active again.",
        },
      });
    } catch {
      updateSlide(slide.id, {
        notice: { kind: "error", text: "Failed to remove the banner." },
      });
    } finally {
      updateSlide(slide.id, { busy: null });
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
      <h2 className="text-lg font-bold text-heading">Hero Banners</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Customize the full-width banner slider on the homepage. Each slide can
        have its own image and an optional link to any page, course or section.
        PNG, JPG, WebP, GIF or SVG up to 5 MB. Square corners — no rounding is
        applied to banners.
      </p>

      <div className="mt-6 space-y-6">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="overflow-hidden rounded-2xl border border-ink/10 bg-dark-850"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
              <p className="text-sm font-bold text-heading">
                {bannerSlides.find((item) => item.id === slide.id)?.alt ??
                  slide.id}
              </p>
              <span
                className={
                  slide.custom
                    ? "rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-400"
                    : "rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-neutral-500"
                }
              >
                {slide.custom ? "Custom banner" : "Default banner"}
              </span>
            </div>

            <div className="p-4">
              <div className="overflow-hidden bg-dark-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={bannerSlides.find((item) => item.id === slide.id)?.alt ?? ""}
                  className="aspect-[8/3] w-full object-cover sm:aspect-[16/5]"
                />
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-500">
                    Link (optional)
                  </span>
                  <input
                    type="text"
                    value={slide.href}
                    onChange={(event) =>
                      updateSlide(slide.id, { href: event.target.value })
                    }
                    placeholder="/courses/botany, /exam, /#our-success …"
                    className="mt-1 w-full rounded-xl border border-ink/10 bg-dark-900 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60"
                  />
                </label>

                <SlideUploader
                  slide={slide}
                  onSave={(file) => handleSave(slide, file)}
                  onRemove={() => handleRemove(slide)}
                />

                {slide.notice && (
                  <p
                    className={
                      slide.notice.kind === "success"
                        ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400"
                        : "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
                    }
                    role="status"
                  >
                    {slide.notice.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SlideUploader({
  slide,
  onSave,
  onRemove,
}: {
  slide: SlideState;
  onSave: (file: File) => void;
  onRemove: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-xl border border-dashed border-ink/20 bg-dark-900 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-primary-500/50 hover:text-heading">
        {file ? file.name : "Choose banner image"}
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => {
            setFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-sm font-semibold text-neutral-500 transition hover:text-heading"
        >
          Clear
        </button>
      )}
      <button
        type="button"
        onClick={() => file && onSave(file)}
        disabled={!file || slide.busy !== null}
        className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {slide.busy === "save" ? "Saving…" : "Save Banner"}
      </button>
      {slide.custom && (
        <button
          type="button"
          onClick={onRemove}
          disabled={slide.busy !== null}
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {slide.busy === "remove" ? "Removing…" : "Remove Banner"}
        </button>
      )}
    </div>
  );
}