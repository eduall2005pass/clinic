"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { CustomBanner } from "@/lib/banner-store";

type BannerDraft = {
  id: string;
  url: string;
  href: string;
  title: string;
  isActive: boolean;
  isNew?: boolean;
};

export default function HeroBannerManagementPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<BannerDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerDraft | null>(null);

  // Add form
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newHref, setNewHref] = useState("");
  const [adding, setAdding] = useState(false);
  const newFileRef = useRef<HTMLInputElement>(null);

  // Replace image files per banner
  const [replaceFiles, setReplaceFiles] = useState<Record<string, File>>({});
  const replaceRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Load all banners (including inactive)
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch("/api/banners?all=1", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { slides?: CustomBanner[] };
        if (!cancelled && data.slides) {
          setBanners(
            data.slides.map((slide) => ({
              id: slide.id,
              url: slide.url,
              href: slide.href ?? "",
              title: slide.title ?? "",
              isActive: slide.isActive,
            })),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user]);

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && loading)) {
    return <AccessLoading label="Loading banners…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Hero banner management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!banners) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load banners. Please refresh the page.
        </p>
      </section>
    );
  }

  function patchBanner(id: string, patch: Partial<BannerDraft>) {
    setBanners((prev) =>
      prev
        ? prev.map((banner) => (banner.id === id ? { ...banner, ...patch } : banner))
        : prev,
    );
  }

  function moveBanner(index: number, direction: -1 | 1) {
    setBanners((prev) => {
      if (!prev) return prev;
      const items = [...prev];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }

  async function handleAdd() {
    if (!user) return;
    if (!newFile) {
      toast.showToast("error", "Choose a banner image first.");
      return;
    }
    setAdding(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", newFile);
      if (newTitle.trim()) formData.append("title", newTitle.trim());
      if (newHref.trim()) formData.append("href", newHref.trim());
      const response = await fetch("/api/banners", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        slides?: CustomBanner[];
      };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to add the banner.");
        return;
      }
      setBanners(
        (data.slides ?? []).map((slide) => ({
          id: slide.id,
          url: slide.url,
          href: slide.href ?? "",
          title: slide.title ?? "",
          isActive: slide.isActive,
        })),
      );
      setNewFile(null);
      setNewTitle("");
      setNewHref("");
      if (newFileRef.current) newFileRef.current.value = "";
      toast.showToast("success", "Banner added. It is now live on the homepage.");
    } catch {
      toast.showToast("error", "Failed to add the banner.");
    } finally {
      setAdding(false);
    }
  }

  async function handleReplaceImage(banner: BannerDraft) {
    if (!user) return;
    const file = replaceFiles[banner.id];
    if (!file) return;
    setBusyIds((prev) => new Set(prev).add(banner.id));
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("id", banner.id);
      if (banner.title.trim()) formData.append("title", banner.title.trim());
      if (banner.href.trim()) formData.append("href", banner.href.trim());
      const response = await fetch("/api/banners", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        slides?: CustomBanner[];
      };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to replace the banner image.");
        return;
      }
      const saved = data.slides?.find((item) => item.id === banner.id);
      patchBanner(banner.id, { url: saved?.url ?? banner.url });
      setReplaceFiles((prev) => {
        const next = { ...prev };
        delete next[banner.id];
        return next;
      });
      const ref = replaceRefs.current[banner.id];
      if (ref) ref.value = "";
      toast.showToast("success", "Banner image replaced successfully.");
    } catch {
      toast.showToast("error", "Failed to replace the banner image.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(banner.id);
        return next;
      });
    }
  }

  async function handleSaveAll() {
    if (!user || !banners) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/banners", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: banners.map((banner) => banner.id),
          updates: banners.map((banner) => ({
            id: banner.id,
            title: banner.title.trim() || null,
            href: banner.href.trim() || null,
            isActive: banner.isActive,
          })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save banners." });
        toast.showToast("error", data.error ?? "Failed to save banners.");
        return;
      }
      setNotice({ kind: "success", text: "Banners saved. Live website updated." });
      toast.showToast("success", "Banners saved. Live website updated.");
    } catch {
      setNotice({ kind: "error", text: "Failed to save banners." });
      toast.showToast("error", "Failed to save banners.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(banner: BannerDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(banner.id));
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/banners", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: banner.id }),
      });
      const data = (await response.json()) as {
        error?: string;
        slides?: CustomBanner[];
      };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the banner.");
        return;
      }
      setBanners(
        (data.slides ?? []).map((slide) => ({
          id: slide.id,
          url: slide.url,
          href: slide.href ?? "",
          title: slide.title ?? "",
          isActive: slide.isActive,
        })),
      );
      toast.showToast("success", "Banner deleted.");
    } catch {
      toast.showToast("error", "Failed to delete the banner.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(banner.id);
        return next;
      });
    }
  }

  const cardClass =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500/60 focus:bg-white admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100 disabled:opacity-60";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Hero / Banner
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Manage the homepage hero banner slider — add, edit, reorder, hide or
          delete banners. Changes go live immediately after saving.
        </p>
      </header>

      {/* Add banner */}
      <div className={`${cardClass} mt-6`}>
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          Add New Banner
        </h3>
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Image *</span>
            <input
              ref={newFileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Title</span>
              <input
                type="text"
                value={newTitle}
                maxLength={255}
                placeholder="Featured Course"
                onChange={(event) => setNewTitle(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Link (optional)</span>
              <input
                type="text"
                value={newHref}
                maxLength={500}
                placeholder="/exam or https://…"
                onChange={(event) => setNewHref(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="mt-1 w-fit rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add Banner"}
          </button>
        </div>
      </div>

      {/* Existing banners */}
      <ul className="mt-6 space-y-3">
        {banners.map((banner, index) => {
          const busy = busyIds.has(banner.id);
          const replaceFile = replaceFiles[banner.id];
          return (
            <li key={banner.id} className={`${cardClass} ${banner.isActive ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 admin-dark:border-zinc-700 admin-dark:bg-zinc-800">
                  <Image
                    src={replaceFile ? URL.createObjectURL(replaceFile) : banner.url}
                    alt={banner.title || "Banner"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[10px] text-zinc-400">{banner.id}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Title</span>
                      <input
                        type="text"
                        value={banner.title}
                        maxLength={255}
                        onChange={(event) =>
                          patchBanner(banner.id, { title: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Link</span>
                      <input
                        type="text"
                        value={banner.href}
                        maxLength={500}
                        placeholder="/exam or https://…"
                        onChange={(event) =>
                          patchBanner(banner.id, { href: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move banner ${index + 1} up`}
                    onClick={() => moveBanner(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move banner ${index + 1} down`}
                    onClick={() => moveBanner(index, 1)}
                    disabled={index === banners.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={banner.isActive}
                    aria-label={`Toggle banner ${index + 1}`}
                    onClick={() =>
                      patchBanner(banner.id, { isActive: !banner.isActive })
                    }
                    className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition ${
                      banner.isActive
                        ? "bg-primary-600"
                        : "bg-zinc-300 admin-dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        banner.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Row actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 admin-dark:border-zinc-800">
                <label className="cursor-pointer rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 admin-dark:border-zinc-700 admin-dark:text-zinc-300">
                  {replaceFile ? replaceFile.name : "Replace image"}
                  <input
                    ref={(el) => {
                      replaceRefs.current[banner.id] = el;
                    }}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file)
                        setReplaceFiles((prev) => ({ ...prev, [banner.id]: file }));
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleReplaceImage(banner)}
                  disabled={!replaceFile || busy}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:bg-zinc-100 admin-dark:text-zinc-900 admin-dark:hover:bg-white"
                >
                  {busy ? "Working…" : "Upload Replacement"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(banner)}
                  disabled={busy}
                  className="ml-auto rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/15 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
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

      {/* Save all meta + order */}
      <button
        type="button"
        onClick={handleSaveAll}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {saving ? "Saving…" : "Save Titles, Links, Order & Visibility"}
      </button>

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this banner?"
        message={
          deleteTarget
            ? `"${deleteTarget.title || deleteTarget.id}" will be removed from the live homepage slider permanently.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
