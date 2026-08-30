"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { CustomBanner } from "@/lib/banner-store";

type BannerDraft = {
  id: string;
  url: string;
  title: string;
  href: string;
  isActive: boolean;
  startAt: string; // datetime-local
  endAt: string;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDraft(banner: CustomBanner): BannerDraft {
  return {
    id: banner.id,
    url: banner.url,
    title: banner.title ?? "",
    href: banner.href ?? "",
    isActive: banner.isActive,
    startAt: toLocalInput(banner.startAt),
    endAt: toLocalInput(banner.endAt),
  };
}

const EMPTY_UPLOAD = { title: "", href: "", startAt: "", endAt: "" };

export default function PromotionalBannersPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();

  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");
  const [banners, setBanners] = useState<BannerDraft[] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ ...EMPTY_UPLOAD });
  const [deleteTarget, setDeleteTarget] = useState<BannerDraft | null>(null);

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

  // Load all banners
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch("/api/banners/all", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: CustomBanner[] };
        if (!cancelled && data.slides) setBanners(data.slides.map(toDraft));
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user]);

  async function refresh(token: string) {
    const res = await fetch("/api/banners/all", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { slides?: CustomBanner[] };
    if (data.slides) setBanners(data.slides.map(toDraft));
  }

  async function handleUpload() {
    if (!user || !file) return;
    setUploading(true);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", uploadForm.title);
      formData.set("href", uploadForm.href);
      formData.set("start_at", uploadForm.startAt);
      formData.set("end_at", uploadForm.endAt);
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to upload the banner.");
        return;
      }
      await refresh(token);
      setFile(null);
      setUploadForm({ ...EMPTY_UPLOAD });
      toast.showToast("success", "Banner added.");
    } catch {
      toast.showToast("error", "Failed to upload the banner.");
    } finally {
      setUploading(false);
    }
  }

  function patchBanner(id: string, patch: Partial<BannerDraft>) {
    setBanners((prev) =>
      prev ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) : prev,
    );
  }

  async function handleSaveBanner(banner: BannerDraft) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/banners", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          updates: [
            {
              id: banner.id,
              title: banner.title || null,
              href: banner.href || null,
              isActive: banner.isActive,
              startAt: banner.startAt || null,
              endAt: banner.endAt || null,
            },
          ],
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to save the banner.");
        return;
      }
      toast.showToast(
        "success",
        banner.isActive ? "Banner saved and live." : "Banner saved (inactive).",
      );
    } catch {
      toast.showToast("error", "Failed to save the banner.");
    }
  }

  function moveBanner(index: number, direction: -1 | 1) {
    setBanners((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleReorder() {
    if (!user || !banners) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/banners", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order: banners.map((banner) => banner.id) }),
      });
    } catch {
      toast.showToast("error", "Failed to save the order.");
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/banners", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: target.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the banner.");
        return;
      }
      setBanners((prev) =>
        prev ? prev.filter((item) => item.id !== target.id) : prev,
      );
      toast.showToast("success", "Banner deleted.");
    } catch {
      toast.showToast("error", "Failed to delete the banner.");
    }
  }

  if (
    authLoading ||
    adminStatus === "checking" ||
    (adminStatus === "admin" && initialLoading)
  ) {
    return <AccessLoading label="Loading promotional banners…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Promotional banner management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100";
  const labelClass =
    "block text-xs font-semibold uppercase tracking-wider text-slate-400";
  const iconButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-slate-500 transition hover:border-[#93c5fd] hover:text-[#1a3a78] disabled:cursor-not-allowed disabled:opacity-30 admin-dark:border-zinc-700 admin-dark:text-slate-400";
  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 shadow-sm transition-colors duration-300 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          Promotional Banners
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          Upload banners for the homepage slider with links, start/end dates
          and active status. Only active banners within their date window are
          shown to visitors.
        </p>
      </header>

      {/* Upload */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
          Add Banner
        </h3>
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className={labelClass}>Image (PNG, JPG, WebP, GIF or SVG · max 5 MB)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Title (optional)</span>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Link (optional)</span>
              <input
                type="text"
                value={uploadForm.href}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, href: e.target.value }))
                }
                placeholder="/courses or https://…"
                className={inputClass}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Start date (optional)</span>
              <input
                type="datetime-local"
                value={uploadForm.startAt}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, startAt: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>End date (optional)</span>
              <input
                type="datetime-local"
                value={uploadForm.endAt}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, endAt: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start"
          >
            {uploading ? "Uploading…" : "Upload Banner"}
          </button>
        </div>
      </div>

      {/* List */}
      {!banners && (
        <p className={`${cardClass} mt-6 py-6 text-center text-sm font-semibold text-slate-500`}>
          Loading…
        </p>
      )}
      {banners?.length === 0 && (
        <p className={`${cardClass} mt-6 py-8 text-center text-sm font-semibold text-slate-500`}>
          No banners yet.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {banners?.map((banner, index) => (
          <li key={banner.id} className={`${cardClass} p-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative h-12 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-[#f1f5f9] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
                <Image
                  src={banner.url}
                  alt={banner.title || "Banner"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  banner.isActive
                    ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                    : "bg-zinc-200 text-slate-500 admin-dark:bg-zinc-700 admin-dark:text-zinc-300"
                }`}
              >
                {banner.isActive ? "Active" : "Inactive"}
              </span>
              <span className="ml-auto flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    moveBanner(index, -1);
                    handleReorder();
                  }}
                  disabled={index === 0}
                  aria-label="Move up"
                  className={iconButtonClass}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    moveBanner(index, 1);
                    handleReorder();
                  }}
                  disabled={index === banners.length - 1}
                  aria-label="Move down"
                  className={iconButtonClass}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(banner)}
                  aria-label="Delete banner"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-red-500 transition hover:border-red-500/60 hover:bg-red-500/10 admin-dark:border-zinc-700"
                >
                  ✕
                </button>
              </span>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Title</span>
                  <input
                    type="text"
                    value={banner.title}
                    onChange={(e) => patchBanner(banner.id, { title: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Link</span>
                  <input
                    type="text"
                    value={banner.href}
                    onChange={(e) => patchBanner(banner.id, { href: e.target.value })}
                    placeholder="/courses or https://…"
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Start date</span>
                  <input
                    type="datetime-local"
                    value={banner.startAt}
                    onChange={(e) =>
                      patchBanner(banner.id, { startAt: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>End date</span>
                  <input
                    type="datetime-local"
                    value={banner.endAt}
                    onChange={(e) =>
                      patchBanner(banner.id, { endAt: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={banner.isActive}
                    onChange={(e) =>
                      patchBanner(banner.id, { isActive: e.target.checked })
                    }
                    className="h-4 w-4 accent-primary-600"
                  />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Show on website
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSaveBanner(banner)}
                  className="ml-auto self-start rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-zinc-600 transition hover:border-[#93c5fd] hover:text-[#1a3a78] admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this banner?"
        message={
          deleteTarget
            ? `"${deleteTarget.title || deleteTarget.id}" will be permanently removed from the slider.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
