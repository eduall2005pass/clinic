"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLogo } from "@/components/LogoProvider";
import { useAuth } from "@/lib/auth-context";
import { MAX_LOGO_FILE_SIZE } from "@/lib/logo";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

export default function LogoManager() {
  const { logo, isCustom, refresh } = useLogo();
  const { user, authLoading } = useAuth();
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

  const adminCheck =
    !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking") {
    return <AccessLoading label="Checking administrator access…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The website logo settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  function handleFileChange(file: File | undefined) {
    setNotice(null);
    if (!file) {
      setSelected(null);
      setPreviewUrl(null);
      return;
    }
    if (file.size > MAX_LOGO_FILE_SIZE) {
      setNotice({
        kind: "error",
        text: "File is too large. The logo must be 5 MB or smaller.",
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
      formData.append("logo", selected);
      const response = await fetch("/api/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
      };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save the logo." });
        return;
      }
      await refresh();
      setSelected(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({ kind: "success", text: "Logo saved. It is now live across the website." });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the logo." });
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
      const response = await fetch("/api/logo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setNotice({ kind: "error", text: "Failed to remove the logo." });
        return;
      }
      await refresh();
      setNotice({
        kind: "success",
        text: "Custom logo removed. The default MediSpark logo is active again.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to remove the logo." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
        <h2 className="text-lg font-bold text-heading">Website Logo</h2>
        <p className="mt-1 text-xs text-neutral-500">
          This is exactly what visitors see right now.
        </p>

        <div className="mt-5 flex min-h-44 items-center justify-center rounded-xl bg-dark-850 p-6">
          <Image
            key={logo.url}
            src={logo.url}
            alt="Active website logo"
            width={logo.width}
            height={logo.height}
            priority
            unoptimized={logo.url.startsWith("/api/files/") || logo.url.startsWith("/uploads/")}
            className="max-h-40 w-auto object-contain"
          />
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Status</dt>
            <dd
              className={
                isCustom
                  ? "mt-0.5 font-semibold text-primary-400"
                  : "mt-0.5 font-semibold text-heading"
              }
            >
              {isCustom ? "Custom logo" : "Default MediSpark logo"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">File</dt>
            <dd className="mt-0.5 font-mono text-xs text-neutral-400">
              {isCustom ? logo.fileName : "medispark-logo.png"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Dimensions</dt>
            <dd className="mt-0.5 text-neutral-400">
              {logo.width} × {logo.height}px
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Last updated</dt>
            <dd className="mt-0.5 text-neutral-400">
              {isCustom
                ? new Date(logo.updatedAt).toLocaleString()
                : "Never (using default)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Updated by</dt>
            <dd className="mt-0.5 text-neutral-400">
              {isCustom && logo.updatedBy ? logo.updatedBy : "—"}
            </dd>
          </div>
        </dl>

        {isCustom && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy === "remove"}
            className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "remove" ? "Restoring…" : "Restore Default Logo"}
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
        <h2 className="text-lg font-bold text-heading">Upload New Logo</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Upload a new logo to replace the current one. PNG (transparent
          preferred), JPG, WebP, GIF or SVG up to 5 MB. The original aspect
          ratio is preserved — the logo is never stretched, squeezed or
          cropped.
        </p>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/20 bg-dark-850 px-6 py-10 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5">
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
            {busy === "save" ? "Saving…" : selected ? selected.name : "Click to choose a logo image"}
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            {selected
              ? `${(selected.size / 1024).toFixed(1)} KB`
              : "PNG, JPG, WebP, GIF or SVG — max 5 MB"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </label>

        {previewUrl && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-neutral-500">
              Preview
            </p>
            <div className="mt-2 flex min-h-40 items-center justify-center rounded-xl bg-dark-850 p-6">
              <Image
                src={previewUrl}
                alt="Selected logo preview"
                width={512}
                height={512}
                className="max-h-36 w-auto object-contain"
              />
            </div>
          </div>
        )}

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

        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || busy !== null}
          className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save Logo"}
        </button>
      </section>
    </>
  );
}
