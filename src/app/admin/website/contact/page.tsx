"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type Notice = { kind: "success" | "error"; text: string };

type ContactLink = { label: string; href: string };

type ContactForm = {
  contactPhone: string;
  contactEmail: string;
  address: string;
  facebookUrl: string;
  youtubeUrl: string;
  otherContactLinks: ContactLink[];
};

const EMPTY_FORM: ContactForm = {
  contactPhone: "",
  contactEmail: "",
  address: "",
  facebookUrl: "",
  youtubeUrl: "",
  otherContactLinks: [],
};

const inputClass =
  "mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60";

export default function ContactInformationPage() {
  const { user, authLoading } = useAuth();

  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
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

  // Load current values from MySQL through the existing API
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/website-settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          settings?: Partial<ContactForm> & {
            otherContactLinks?: ContactLink[] | null;
          } | null;
        };
        if (cancelled || !data.settings) return;
        const s = data.settings;
        setForm({
          contactPhone: s.contactPhone ?? "",
          contactEmail: s.contactEmail ?? "",
          address: s.address ?? "",
          facebookUrl: s.facebookUrl ?? "",
          youtubeUrl: s.youtubeUrl ?? "",
          otherContactLinks: Array.isArray(s.otherContactLinks)
            ? s.otherContactLinks
            : [],
        });
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || initialLoading) {
    return <AccessLoading label="Loading contact information…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The contact information is restricted to authorized administrators. Your account does not have permission to change it."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  function updateLink(index: number, patch: Partial<ContactLink>) {
    setForm((prev) => ({
      ...prev,
      otherContactLinks: prev.otherContactLinks.map((link, i) =>
        i === index ? { ...link, ...patch } : link,
      ),
    }));
  }

  function moveLink(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const next = [...prev.otherContactLinks];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, otherContactLinks: next };
    });
  }

  async function handleSave() {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("contact_phone", form.contactPhone.trim());
      formData.append("contact_email", form.contactEmail.trim());
      formData.append("address", form.address.trim());
      formData.append("facebook_url", form.facebookUrl.trim());
      formData.append("youtube_url", form.youtubeUrl.trim());
      formData.append(
        "other_contact_links",
        JSON.stringify(
          form.otherContactLinks.map((link) => ({
            label: link.label.trim(),
            href: link.href.trim(),
          })),
        ),
      );

      const response = await fetch("/api/website-settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: data.error ?? "Failed to save the contact information.",
        });
        return;
      }
      setNotice({
        kind: "success",
        text: "Contact information saved. Changes are now live on the website.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the contact information." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">
            Contact Information
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Manage the public contact details shown across the website — phone,
            email, address and social links. Changes are saved to MySQL and go
            live immediately.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {/* Basic contact */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Contact Details</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Phone Number</span>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  placeholder="+880 1XXX-XXXXXX"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Email</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  placeholder="support@medispark.com"
                  className={inputClass}
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-semibold text-neutral-500">Address</span>
              <textarea
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                rows={2}
                placeholder="House 12, Road 3, Dhanmondi, Dhaka-1205"
                className={`${inputClass} resize-none`}
              />
            </label>
          </section>

          {/* Social */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Social Links</h2>
            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Facebook Page URL</span>
                <input
                  type="url"
                  value={form.facebookUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))
                  }
                  placeholder="https://facebook.com/medispark"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">YouTube Channel URL</span>
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                  }
                  placeholder="https://youtube.com/@medispark"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          {/* Other links */}
          <section className="rounded-2xl border border-ink/10 bg-dark-900 p-6">
            <h2 className="text-lg font-bold text-heading">Other Contact / Social Links</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Any additional links shown in the footer contact column — e.g.
              WhatsApp, LinkedIn, Telegram.
            </p>

            <div className="mt-5 space-y-3">
              {form.otherContactLinks.map((link, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-xl border border-ink/10 bg-dark-850 p-3">
                  <label className="block min-w-0 flex-[2]">
                    <span className="text-xs font-semibold text-neutral-500">Label</span>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(index, { label: e.target.value })}
                      placeholder="WhatsApp"
                      className={inputClass}
                    />
                  </label>
                  <label className="block min-w-0 flex-[3]">
                    <span className="text-xs font-semibold text-neutral-500">Link</span>
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => updateLink(index, { href: e.target.value })}
                      placeholder="https://wa.me/8801XXXXXXXXX"
                      className={inputClass}
                    />
                  </label>
                  <div className="flex shrink-0 gap-1 pb-1">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-primary-500/60 hover:text-heading disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === form.otherContactLinks.length - 1}
                      aria-label="Move down"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-primary-500/60 hover:text-heading disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          otherContactLinks: prev.otherContactLinks.filter(
                            (_, i) => i !== index,
                          ),
                        }))
                      }
                      aria-label="Remove link"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/40 text-red-400 transition hover:bg-red-500/10"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {form.otherContactLinks.length < 20 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      otherContactLinks: [
                        ...prev.otherContactLinks,
                        { label: "", href: "" },
                      ],
                    }))
                  }
                  className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
                >
                  + Add Link
                </button>
              )}
            </div>
          </section>

          {notice && (
            <p
              className={
                notice.kind === "success"
                  ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
                  : "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
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
            className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </section>
    </main>
  );
}
