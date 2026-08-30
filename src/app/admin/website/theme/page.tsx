"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

type ButtonStyle = "default" | "pill" | "square";
type BorderRadius = "default" | "small" | "large" | "sharp";
type ThemeMode = "dark" | "light";

type ThemeSettings = {
  primaryColor: string;
  secondaryColor: string;
  buttonStyle: ButtonStyle;
  borderRadius: BorderRadius;
  themeMode: ThemeMode;
};

const DEFAULT_PRIMARY = "#e50914";
const DEFAULT_SECONDARY = "#3b82f6";

const BUTTON_STYLE_OPTIONS: { value: ButtonStyle; label: string; hint: string }[] = [
  { value: "default", label: "Default", hint: "Follows the border radius setting" },
  { value: "pill", label: "Pill", hint: "Fully rounded buttons" },
  { value: "square", label: "Square", hint: "Sharp corners on buttons" },
];

const RADIUS_OPTIONS: { value: BorderRadius; label: string; hint: string }[] = [
  { value: "default", label: "Default", hint: "Current website rounding" },
  { value: "small", label: "Small", hint: "Subtle rounded corners" },
  { value: "large", label: "Large", hint: "Extra rounded corners" },
  { value: "sharp", label: "Sharp", hint: "No rounding anywhere" },
];

const THEME_MODE_OPTIONS: { value: ThemeMode; label: string; hint: string }[] = [
  { value: "dark", label: "Dark", hint: "Visitors start in dark mode" },
  { value: "light", label: "Light", hint: "Visitors start in light mode" },
];

export default function ThemeAppearancePage() {
  const { user, authLoading } = useAuth();

  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
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

  // Load theme settings
  useEffect(() => {
    if (authLoading || !user || adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/theme-settings", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { theme?: ThemeSettings };
        if (data.theme && !cancelled) setSettings(data.theme);
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
    return <AccessLoading label="Loading theme settings…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Theme & appearance settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  function patch(patchValues: Partial<ThemeSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patchValues } : prev));
  }

  async function handleSave() {
    if (!user || !settings) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/theme-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        theme?: ThemeSettings;
      } | null;
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to save the theme settings.",
        });
        return;
      }
      if (data?.theme) setSettings(data.theme);
      setNotice({
        kind: "success",
        text: "Theme saved. Changes are now live on the website.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the theme settings." });
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60";

  const effectivePrimary = settings?.primaryColor || DEFAULT_PRIMARY;
  const effectiveSecondary = settings?.secondaryColor || DEFAULT_SECONDARY;

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">
            Theme &amp; Appearance
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Control the public website&apos;s colors, button style, border
            radius and default light/dark mode. These settings apply to the
            live website only — the Admin Panel keeps its own look.
          </p>
        </header>

        {!settings ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load the current theme settings. Please refresh the page.
          </p>
        ) : (
          <>
            {/* Colors */}
            <section className="mt-8 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Colors</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Pick a base color — lighter and darker shades are generated
                automatically across the website.
              </p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold text-neutral-500">
                    Primary color
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={effectivePrimary}
                      onChange={(e) =>
                        patch({ primaryColor: e.target.value.toLowerCase() })
                      }
                      aria-label="Primary color"
                      className="h-11 w-14 cursor-pointer rounded-lg border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] p-1"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        patch({
                          primaryColor: e.target.value.startsWith("#")
                            ? e.target.value.toLowerCase()
                            : `#${e.target.value.toLowerCase()}`,
                        })
                      }
                      placeholder={DEFAULT_PRIMARY}
                      maxLength={7}
                      className={`${inputClass} mt-0 flex-1 font-mono`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ primaryColor: "" })}
                    className="mt-2 text-xs font-medium text-neutral-500 transition hover:text-heading"
                  >
                    Reset to default red
                  </button>
                </div>

                <div>
                  <span className="text-xs font-semibold text-neutral-500">
                    Secondary color
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={effectiveSecondary}
                      onChange={(e) =>
                        patch({ secondaryColor: e.target.value.toLowerCase() })
                      }
                      aria-label="Secondary color"
                      className="h-11 w-14 cursor-pointer rounded-lg border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] p-1"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) =>
                        patch({
                          secondaryColor: e.target.value.startsWith("#")
                            ? e.target.value.toLowerCase()
                            : `#${e.target.value.toLowerCase()}`,
                        })
                      }
                      placeholder={DEFAULT_SECONDARY}
                      maxLength={7}
                      className={`${inputClass} mt-0 flex-1 font-mono`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ secondaryColor: "" })}
                    className="mt-2 text-xs font-medium text-neutral-500 transition hover:text-heading"
                  >
                    Reset to default blue
                  </button>
                </div>
              </div>

              {/* Live preview strip */}
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] p-4">
                <span className="text-xs font-medium text-neutral-500">
                  Preview:
                </span>
                <span
                  className="h-8 w-8 rounded-full border border-white/10"
                  style={{ backgroundColor: effectivePrimary }}
                />
                <span
                  className="h-8 w-8 rounded-full border border-white/10"
                  style={{ backgroundColor: effectiveSecondary }}
                />
                <button
                  type="button"
                  className="rounded-xl px-4 py-1.5 text-xs font-bold text-white"
                  style={{ backgroundColor: effectivePrimary }}
                >
                  Primary Button
                </button>
                <button
                  type="button"
                  className="rounded-xl px-4 py-1.5 text-xs font-bold text-white"
                  style={{ backgroundColor: effectiveSecondary }}
                >
                  Secondary Button
                </button>
              </div>
            </section>

            {/* Button style */}
            <section className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Button Style</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {BUTTON_STYLE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      settings.buttonStyle === option.value
                        ? "border-primary-500/60 bg-primary-600/10"
                        : "border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] hover:border-primary-500/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="button-style"
                      checked={settings.buttonStyle === option.value}
                      onChange={() => patch({ buttonStyle: option.value })}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-heading">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Border radius */}
            <section className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Border Radius</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {RADIUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      settings.borderRadius === option.value
                        ? "border-primary-500/60 bg-primary-600/10"
                        : "border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] hover:border-primary-500/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="border-radius"
                      checked={settings.borderRadius === option.value}
                      onChange={() => patch({ borderRadius: option.value })}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-heading">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Light / Dark */}
            <section className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">
                Website Theme Mode
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                The default mode for visitors. Visitors can still switch modes
                with the website theme toggle.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {THEME_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      settings.themeMode === option.value
                        ? "border-primary-500/60 bg-primary-600/10"
                        : "border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] hover:border-primary-500/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme-mode"
                      checked={settings.themeMode === option.value}
                      onChange={() => patch({ themeMode: option.value })}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-heading">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
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
