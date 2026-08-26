"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import type { HomepageSection } from "@/lib/homepage-sections-constants";

type Notice = { kind: "success" | "error"; text: string };

type Mentor = {
  id: string;
  name: string;
  subject: string;
  note: string;
  initials: string;
  isActive: boolean;
};

export default function MentorSectionPage() {
  const { user, authLoading } = useAuth();

  const [sections, setSections] = useState<HomepageSection[] | null>(null);
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
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

  // Load section settings + mentors
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sectionRes, mentorRes] = await Promise.all([
          fetch("/api/homepage-sections", { cache: "no-store" }),
          fetch("/api/mentors", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (sectionRes.ok) {
          const data = (await sectionRes.json()) as { sections?: HomepageSection[] };
          if (data.sections) setSections(data.sections);
        }
        if (mentorRes.ok) {
          const data = (await mentorRes.json()) as { mentors?: Mentor[] };
          if (data.mentors) setMentors(data.mentors);
        }
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
  }, []);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  if (authLoading || adminCheck === "checking" || initialLoading) {
    return <AccessLoading label="Loading mentor section settings…" />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="The mentor section settings are restricted to authorized administrators. Your account does not have permission to change them."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  const mentorsSection = sections?.find(
    (section) => section.key === "mentors",
  );

  function patchSection(patch: Partial<HomepageSection>) {
    setSections((prev) =>
      prev
        ? prev.map((section) =>
            section.key === "mentors" ? { ...section, ...patch } : section,
          )
        : prev,
    );
  }

  function moveMentor(index: number, direction: -1 | 1) {
    setMentors((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!user || !sections || !mentors || !mentorsSection) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Save section visibility/title via the existing homepage-sections API.
      const sectionResponse = await fetch("/api/homepage-sections", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ sections }),
      });
      if (!sectionResponse.ok) {
        const data = (await sectionResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to save the section settings.",
        });
        return;
      }

      // Save which mentors appear and in what order.
      const mentorResponse = await fetch("/api/mentors", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          mentors: mentors.map((mentor) => ({
            id: mentor.id,
            name: mentor.name,
            subject: mentor.subject,
            note: mentor.note,
            initials: mentor.initials,
            isActive: mentor.isActive,
          })),
        }),
      });
      if (!mentorResponse.ok) {
        const data = (await mentorResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        setNotice({
          kind: "error",
          text: data?.error ?? "Failed to save the mentors.",
        });
        return;
      }

      setNotice({
        kind: "success",
        text: "Mentor section saved. Changes are now live on the homepage.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the mentor section." });
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60";

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">
            Mentor Section
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Control the mentors section on the homepage — show or hide it,
            edit its title, choose which mentors appear and in what order.
            Changes are saved to MySQL and go live immediately.
          </p>
        </header>

        {!mentorsSection || !mentors ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load the current settings. Please refresh the page.
          </p>
        ) : (
          <>
            <div className="mt-8 space-y-6">
              {/* Visibility */}
              <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
                <h2 className="text-lg font-bold text-heading">Visibility</h2>
                <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-4 py-3.5">
                  <span>
                    <span className="block text-sm font-semibold text-heading">
                      Show mentors section on the homepage
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      When off, the entire mentors section is hidden from visitors.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={mentorsSection.isActive}
                    onChange={(e) =>
                      patchSection({ isActive: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
                      mentorsSection.isActive ? "bg-primary-600" : "bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
                        mentorsSection.isActive ? "left-[1.375rem]" : "left-0.5"
                      }`}
                    />
                  </span>
                </label>
              </section>

              {/* Section text */}
              <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
                <h2 className="text-lg font-bold text-heading">Section Text</h2>

                <div className="mt-6 grid gap-5">
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">Title</span>
                    <input
                      type="text"
                      value={mentorsSection.title ?? ""}
                      onChange={(e) =>
                        patchSection({ title: e.target.value || null })
                      }
                      placeholder="Learn from experienced mentors"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">
                      Description
                    </span>
                    <textarea
                      value={mentorsSection.description ?? ""}
                      onChange={(e) =>
                        patchSection({ description: e.target.value || null })
                      }
                      rows={2}
                      placeholder="Mentor profiles will grow as the platform expands."
                      className={`${inputClass} resize-none`}
                    />
                  </label>
                </div>
              </section>

              {/* Mentors */}
              <section className="rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
                <h2 className="text-lg font-bold text-heading">Mentors</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Tick the mentors that appear on the homepage and use the
                  arrows to change their display order.
                </p>

                <div className="mt-5 space-y-3">
                  {mentors.map((mentor, index) => (
                    <div
                      key={mentor.id}
                      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        mentor.isActive
                          ? "border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547]"
                          : "border-dashed border-ink/15 bg-white admin-dark:bg-[#112544] opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={mentor.isActive}
                        onChange={(e) =>
                          setMentors((prev) =>
                            (prev ?? []).map((item) =>
                              item.id === mentor.id
                                ? { ...item, isActive: e.target.checked }
                                : item,
                            ),
                          )
                        }
                        className="h-4 w-4 shrink-0 accent-primary-600"
                        aria-label={`Show ${mentor.name}`}
                      />
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xs font-extrabold text-white">
                        {mentor.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-heading">
                          {mentor.name}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          {mentor.subject}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => moveMentor(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${mentor.name} up`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-[#93c5fd] hover:text-heading disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMentor(index, 1)}
                          disabled={index === mentors.length - 1}
                          aria-label={`Move ${mentor.name} down`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-[#93c5fd] hover:text-heading disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </span>
                    </div>
                  ))}
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
          </>
        )}
      </section>
    </main>
  );
}
