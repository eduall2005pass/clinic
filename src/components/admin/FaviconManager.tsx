"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWebsiteSettings } from "@/components/WebsiteSettingsProvider";
import {
  ALLOWED_FAVICON_EXTENSIONS,
  MAX_FAVICON_FILE_SIZE,
} from "@/lib/website-settings-constants";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

const FAVICON_ACCEPT =
  ".ico,.png,.jpg,.jpeg,.webp,.gif,.svg,image/x-icon,image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

function cacheBustedFavicon(url: string, version: number | null): string {
  if (!url) return url;
  const v = version ?? Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
}

/** Keeps the browser tab icon in sync with the latest favicon. */
export function applyFaviconToHead(url: string | null) {
  if (typeof document === "undefined") return;
  const head = document.head;
  let link = head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!url) {
    // Custom favicon removed — drop the override so the default applies.
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    head.appendChild(link);
  }
  link.href = url;
}

export default function FaviconManager() {
  const { user, authLoading } = useAuth();
  const { settings, refresh } = useWebsiteSettings();

  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking") {
    return <AccessLoading label="Checking administrator access…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The favicon settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  const activeFaviconUrl = settings.faviconUrl;

  function handleFileChange(file: File | undefined) {
    setNotice(null);
    if (!file) {
      setSelected(null);
      setPreviewUrl(null);
      return;
    }
    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()?.toLowerCase()}`
      : "";
    if (
      !ALLOWED_FAVICON_EXTENSIONS.includes(
        extension as (typeof ALLOWED_FAVICON_EXTENSIONS)[number],
      )
    ) {
      setNotice({
        kind: "error",
        text: "Unsupported file type. Use ICO, PNG, JPG, WebP, GIF or SVG.",
      });
      return;
    }
    if (file.size > MAX_FAVICON_FILE_SIZE) {
      setNotice({
        kind: "error",
        text: "File is too large. The favicon must be 5 MB or smaller.",
      });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelected(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!selected || !user) return;
    setBusy("save");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("favicon", selected);
      const response = await fetch("/api/website-settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        settings?: { faviconUrl?: string | null };
      };
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data.error ?? "Failed to save the favicon.",
        });
        return;
      }
      await refresh();
      // Live update: swap the tab icon immediately with a fresh cache-bust.
      applyFaviconToHead(
        cacheBustedFavicon(data.settings?.faviconUrl ?? "", Date.now()),
      );
      setSelected(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({
        kind: "success",
        text: "Favicon saved. It may take a moment to appear in the browser tab.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the favicon." });
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (!user) return;
    setBusy("remove");
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        "/api/website-settings?target=favicon",
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to restore the default favicon.",
        });
        return;
      }
      await refresh();
      applyFaviconToHead(null);
      setNotice({
        kind: "success",
        text: "Custom favicon removed. The default MediSpark favicon is active again.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to restore the default favicon." });
    } finally {
      setBusy(null);
    }
  }

  const displayUrl = previewUrl ?? (activeFaviconUrl ? cacheBustedFavicon(activeFaviconUrl, settings.faviconUpdatedAt) : null);

  return (
    <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
      <h2 className="text-lg font-bold text-heading">Favicon</h2>
      <p className="mt-1 text-xs text-neutral-500">
        The small icon shown in the browser tab and bookmarks.
      </p>

      <div className="mt-5 flex min-h-44 items-center justify-center rounded-xl bg-[#f8fbff] admin-dark:bg-[#0f2547] p-6">
        {displayUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displayUrl}
            alt="Active website favicon"
            className="max-h-24 max-w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-heading">
              Default MediSpark favicon
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Upload a custom favicon to replace it.
            </p>
          </div>
        )}
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-neutral-500">Status</dt>
          <dd
            className={
              activeFaviconUrl
                ? "mt-0.5 font-semibold text-primary-400"
                : "mt-0.5 font-semibold text-heading"
            }
          >
            {activeFaviconUrl ? "Custom favicon" : "Default favicon"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">File</dt>
          <dd className="mt-0.5 font-mono text-xs text-neutral-400">
            {activeFaviconUrl ? settings.faviconFileName : "favicon.ico"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Last updated</dt>
          <dd className="mt-0.5 text-neutral-400">
            {activeFaviconUrl && settings.faviconUpdatedAt
              ? new Date(settings.faviconUpdatedAt).toLocaleString()
              : "Never (using default)"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Updated by</dt>
          <dd className="mt-0.5 text-neutral-400">
            {activeFaviconUrl && settings.updatedBy ? settings.updatedBy : "—"}
          </dd>
        </div>
      </dl>

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/20 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-6 py-10 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5">
        <svg
          className="h-8 w-8 text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        <span className="mt-3 text-sm font-semibold text-heading">
          {busy === "save" ? "Saving…" : selected ? selected.name : "Click to choose a favicon image"}
        </span>
        <span className="mt-1 text-xs text-neutral-500">
          {selected
            ? `${(selected.size / 1024).toFixed(1)} KB`
            : "ICO, PNG, JPG, WebP, GIF or SVG — max 5 MB"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={FAVICON_ACCEPT}
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />
      </label>

      {notice && (
        <p
          className={
            notice.kind === "success"
              ? "mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400"
              : "mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
          }
          role="status"
        >
          {notice.text}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || busy !== null}
          className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save Favicon"}
        </button>
        {activeFaviconUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy !== null}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "remove" ? "Restoring…" : "Restore Default Favicon"}
          </button>
        )}
      </div>
    </section>
  );
}
