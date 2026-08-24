"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLogo } from "@/components/LogoProvider";
import { useAuth } from "@/lib/auth-context";
import type { LogoInfo } from "@/lib/logo";
import { MAX_LOGO_FILE_SIZE } from "@/lib/logo";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };
type LogoMode = "light" | "dark";

const ACCEPTED =
  ".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

function useAdminGate() {
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

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

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
  return null;
}

/** One upload/manage block for a single theme-specific logo slot. */
function VariantManager({
  mode,
  title,
  hint,
  previewBoxClass,
}: {
  mode: LogoMode;
  title: string;
  hint: string;
  /** Background used for the preview box so the logo is judged in-context. */
  previewBoxClass: string;
}) {
  const { light, dark, refresh } = useLogo();
  const { user } = useAuth();
  const current: LogoInfo | null = mode === "light" ? light : dark;

  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      formData.append("mode", mode);
      const response = await fetch("/api/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNotice({ kind: "error", text: data.error ?? "Failed to save the logo." });
        return;
      }
      await refresh();
      setSelected(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({
        kind: "success",
        text: `${title} saved. It now shows automatically for visitors using ${mode} mode.`,
      });
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
      const response = await fetch(`/api/logo?mode=${mode}`, {
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
        text: `${title} removed. Those visitors now see the shared/fallback logo.`,
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to remove the logo." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            mode === "light" ? "bg-yellow-300" : "bg-primary-500"
          }`}
        />
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        <span className="rounded-full bg-dark-800 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          {current ? "Custom" : "Not set"}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>

      {/* Preview — shown in the matching theme context. */}
      <div className={`mt-5 flex min-h-36 items-center justify-center rounded-xl p-6 ${previewBoxClass}`}>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={`${title} preview`}
            width={512}
            height={512}
            className="max-h-32 w-auto object-contain"
          />
        ) : current ? (
          <Image
            key={current.url}
            src={current.url}
            alt={`Active ${title}`}
            width={current.width}
            height={current.height}
            unoptimized={
              current.url.startsWith("/api/files/") ||
              current.url.startsWith("/uploads/")
            }
            className="max-h-32 w-auto object-contain"
          />
        ) : (
          <p className="text-sm text-neutral-500">
            No {mode}-mode logo uploaded — the shared logo is shown instead.
          </p>
        )}
      </div>

      {current && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">File</dt>
            <dd className="mt-0.5 truncate font-mono text-xs text-neutral-400">
              {current.fileName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Dimensions</dt>
            <dd className="mt-0.5 text-neutral-400">
              {current.width} × {current.height}px
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Updated</dt>
            <dd className="mt-0.5 text-neutral-400">
              {new Date(current.updatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      )}

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/20 bg-dark-850 px-6 py-8 text-center transition hover:border-primary-500/50 hover:bg-primary-500/5">
        <svg
          className="h-7 w-7 text-neutral-500"
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
          {selected ? selected.name : "Click to choose a logo image"}
        </span>
        <span className="mt-1 text-xs text-neutral-500">
          {selected
            ? `${(selected.size / 1024).toFixed(1)} KB`
            : "PNG, JPG, WebP, GIF or SVG — max 5 MB"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || busy !== null}
          className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : `Save ${title}`}
        </button>
        {current && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy !== null}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "remove" ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
    </section>
  );
}

export default function LogoManager() {
  const gate = useAdminGate();
  if (gate) return gate;

  return (
    <>
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-5">
        <h1 className="text-base font-extrabold text-heading sm:text-lg">
          Theme-Based Dual Logo System
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-neutral-300">
          Upload a separate logo for each theme. Visitors see the{" "}
          <strong>Light Mode Logo</strong> while using light mode and the{" "}
          <strong>Dark Mode Logo</strong> while using dark mode — switching
          themes swaps the logo instantly, no reload. Both logos stay stored at
          the same time; neither upload order nor preference affects which one
          displays. A logo not set here falls back to the shared logo below.
        </p>
      </div>

      <VariantManager
        mode="light"
        title="Light Mode Logo"
        hint="Shown whenever a visitor is using Light Mode."
        previewBoxClass="bg-white border border-ink/10"
      />

      <VariantManager
        mode="dark"
        title="Dark Mode Logo"
        hint="Shown whenever a visitor is using Dark Mode."
        previewBoxClass="bg-dark-850 border border-ink/10"
      />

      <SharedLogoInfo />
    </>
  );
}

/** Read-only view of the shared fallback logo (managed via Website Settings). */
function SharedLogoInfo() {
  const { logo, isCustom } = useLogo();
  return (
    <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
      <h2 className="text-lg font-bold text-heading">Shared Logo (Fallback)</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Used for any theme whose specific logo is not uploaded yet. Manage this
        logo from Admin Panel → Website Settings → Branding.
      </p>
      <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl bg-dark-850 p-6">
        <Image
          key={logo.url}
          src={logo.url}
          alt="Shared website logo"
          width={logo.width}
          height={logo.height}
          unoptimized={
            logo.url.startsWith("/api/files/") || logo.url.startsWith("/uploads/")
          }
          className="max-h-24 w-auto object-contain"
        />
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Status:{" "}
        <span className={isCustom ? "font-semibold text-primary-400" : "font-semibold text-heading"}>
          {isCustom ? "Custom logo" : "Default MediSpark logo"}
        </span>{" "}
        · File: <span className="font-mono">{isCustom ? logo.fileName : "medispark-logo.png"}</span>
      </p>
    </section>
  );
}
