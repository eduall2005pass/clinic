"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

/**
 * Website Information — the identity of the Main Website:
 * Website Name (edit + save) and Website Logo (upload/replace).
 * Everything flows through the existing MySQL-backed APIs and reflects on
 * the Main Website immediately.
 */
export default function WebsiteInformationPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();

  // Website name
  const [siteName, setSiteName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Logos — dual mode (separate light / dark slots)
  const [logoUrls, setLogoUrls] = useState<{ light: string | null; dark: string | null }>({
    light: null,
    dark: null,
  });
  const [logoLoading, setLogoLoading] = useState(true);
  const [uploadingMode, setUploadingMode] = useState<"light" | "dark" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function token(): Promise<string> {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      try {
        const [settingsRes, logoRes] = await Promise.all([
          fetch("/api/website-settings", { cache: "no-store" }),
          fetch("/api/logo", { cache: "no-store" }),
        ]);
        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as {
            settings?: { siteName?: string };
            siteName?: string;
          };
          const name = data.settings?.siteName ?? data.siteName ?? "MediSpark";
          setSiteName(name);
          setDraftName(name);
        }
        if (logoRes.ok) {
          const data = (await logoRes.json()) as {
            logo?: { url?: string };
            light?: { url?: string } | null;
            dark?: { url?: string } | null;
          };
          setLogoUrls({
            // Fall back to the shared logo until a mode-specific one is set.
            light: data.light?.url ?? data.logo?.url ?? null,
            dark: data.dark?.url ?? data.logo?.url ?? null,
          });
        }
      } finally {
        setLogoLoading(false);
      }
    })();
  }, [authLoading, user]);

  const saveName = useCallback(
    async (value: string) => {
      const name = value.trim();
      if (name.length < 2) {
        toast.showToast("error", "Website name must be at least 2 characters.");
        return;
      }
      setSavingName(true);
      try {
        const res = await fetch("/api/website-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await token()}`,
          },
          body: JSON.stringify({ siteName: name }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.showToast("error", data.error ?? "Failed to save.");
          return;
        }
        setSiteName(name);
        setEditingName(false);
        toast.showToast("success", `Website name saved — "${name}" is now live.`);
      } catch {
        toast.showToast("error", "Failed to save the website name.");
      } finally {
        setSavingName(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  async function uploadLogo(file: File, mode: "light" | "dark") {
    if (!file) return;
    setUploadingMode(mode);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("mode", mode);
      const res = await fetch("/api/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}` },
        body: formData,
      });
      const data = (await res.json()) as {
        error?: string;
        logo?: { url?: string };
      };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Logo upload failed.");
        return;
      }
      if (data.logo?.url) {
        setLogoUrls((prev) => ({ ...prev, [mode]: data.logo!.url! }));
      }
      toast.showToast(
        "success",
        `${mode === "light" ? "Light Mode" : "Dark Mode"} logo saved — live everywhere.`,
      );
    } catch {
      toast.showToast("error", "Logo upload failed.");
    } finally {
      setUploadingMode(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (authLoading || !user) {
    return <AccessLoading label="Loading Website Information…" />;
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Website Information</h1>
      <p className="mt-1 text-sm text-neutral-400">
        The basic identity of the Main Website. Changes go live immediately.
      </p>

      {/* Website Name */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-heading">Website Name</h2>
          {!editingName ? (
            <button
              type="button"
              onClick={() => {
                setDraftName(siteName ?? "");
                setEditingName(true);
              }}
              className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2 text-xs font-bold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
            >
              ✎ Edit
            </button>
          ) : null}
        </div>

        {!editingName ? (
          <p className="mt-3 rounded-xl border border-ink/10 bg-dark-950/60 px-4 py-3 text-sm font-bold text-heading">
            {siteName ?? "…"}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={draftName}
              maxLength={100}
              autoFocus
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveName(draftName);
                if (event.key === "Escape") setEditingName(false);
              }}
              className="min-w-0 flex-1 rounded-xl border border-primary-500/40 bg-dark-850 px-3.5 py-2.5 text-sm font-semibold text-heading outline-none focus:border-primary-500"
              placeholder="New website name…"
            />
            <button
              type="button"
              onClick={() => void saveName(draftName)}
              disabled={savingName}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
            >
              {savingName ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setDraftName(siteName ?? "");
              }}
              disabled={savingName}
              className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-xs font-bold text-heading transition hover:bg-ink/10"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Website Logo — dual mode */}
      {(["light", "dark"] as const).map((mode) => (
        <div
          key={mode}
          className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-heading">
              {mode === "light" ? "☀️ Light Mode Logo" : "🌙 Dark Mode Logo"}
            </h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                mode === "light"
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                  : "border-blue-500/40 bg-blue-600/15 text-blue-300"
              }`}
            >
              Shown in {mode} mode
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5">
            {/* Current preview — checkerboard so transparent logos read well
                against either theme */}
            <div
              className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/10"
              style={{
                backgroundColor:
                  mode === "light" ? "#ffffff" : "#0a0a12",
              }}
            >
              {logoLoading ? (
                <span className="text-xs text-neutral-500">Loading…</span>
              ) : logoUrls[mode] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrls[mode]!}
                  alt={`${mode} mode website logo`}
                  className="max-h-full max-w-full object-contain p-1.5"
                />
              ) : (
                <span className="px-2 text-center text-[11px] text-neutral-500">
                  No {mode} logo uploaded
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-400">
                PNG, JPG, WebP, GIF or SVG · up to 5 MB. Replaces the{" "}
                {mode} Mode logo everywhere; visitors see it automatically
                whenever their appearance is set to {mode}.
              </p>
              <input
                ref={fileRef}
                type="file"
                aria-label={`Upload ${mode} mode logo`}
                accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLogo(file, mode);
                }}
                disabled={uploadingMode !== null}
                className="mt-3 w-full cursor-pointer rounded-xl border border-ink/15 bg-dark-850 px-3 py-2.5 text-xs text-neutral-300 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-primary-700 disabled:opacity-60"
              />
              {uploadingMode === mode && (
                <p className="mt-2 text-xs font-semibold text-primary-400">
                  Uploading & saving…
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
</section>
  );
}
