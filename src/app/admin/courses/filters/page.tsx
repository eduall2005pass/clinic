"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";

type FilterOption = { id: string; label: string };
type Scope = "ssc" | "hsc";

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60";

/**
 * Admin → Courses → Filter Edit. Manages the batch filter pills shown on the
 * Main Website Course pages (SSC / HSC scopes) — stored in MySQL and read
 * live by both the website and the admin replica.
 */
export default function CourseFiltersManager() {
  const { user, authLoading } = useAuth();
  const [status, setStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [scope, setScope] = useState<Scope>("ssc");
  const [options, setOptions] = useState<Record<Scope, FilterOption[] | null>>({
    ssc: null,
    hsc: null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/course-filters", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { ssc?: FilterOption[]; hsc?: FilterOption[] };
      setOptions({ ssc: data.ssc ?? [], hsc: data.hsc ?? [] });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
        if (!cancelled) setStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (status === "admin") void load();
  }, [status, load]);

  async function save() {
    if (!user) return;
    const current = options[scope];
    if (!current || current.length < 2) {
      setMessage({ kind: "error", text: "At least an 'All Batch' option and one batch are required." });
      return;
    }
    if (current[0].id !== "all") {
      setMessage({ kind: "error", text: "The first option must be 'All Batch' (id: all)." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/course-filters", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ scope, options: current }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        options?: FilterOption[];
      } | null;
      if (!res.ok) {
        setMessage({ kind: "error", text: data?.error ?? "Failed to save." });
        return;
      }
      setOptions((prev) => ({ ...prev, [scope]: data?.options ?? current }));
      setMessage({
        kind: "success",
        text: "Filter saved — the Main Website course pages now show these options.",
      });
    } catch {
      setMessage({ kind: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  function updateOption(index: number, patch: Partial<FilterOption>) {
    setOptions((prev) => {
      const list = [...(prev[scope] ?? [])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [scope]: list };
    });
  }

  function addOption() {
    setOptions((prev) => {
      const list = prev[scope] ?? [];
      const prefix = scope;
      const nextNumber =
        list
          .map((option) => Number(option.id.split("-").pop()))
          .filter((n) => Number.isFinite(n))
          .reduce((max, n) => Math.max(max!, n!), 0) + 1;
      return {
        ...prev,
        [scope]: [...list, { id: `${prefix}-${nextNumber}`, label: `${prefix.toUpperCase()} 20${nextNumber}` }],
      };
    });
  }

  function removeOption(index: number) {
    setOptions((prev) => {
      const list = [...(prev[scope] ?? [])];
      if (list[index]?.id === "all") return prev; // never remove "all"
      list.splice(index, 1);
      return { ...prev, [scope]: list };
    });
  }

  if (authLoading || status === "checking") {
    return <AccessLoading label="Loading filter settings…" />;
  }
  if (status === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Filter management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  const current = options[scope];

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Course Filter Edit</h1>
      <p className="mt-1 text-sm text-neutral-400">
        The batch filter pills on the Course pages. Changes save to MySQL and
        appear on the Main Website immediately.
      </p>

      {/* Scope tabs */}
      <div className="mt-6 grid max-w-sm grid-cols-2 gap-3">
        {(["ssc", "hsc"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setScope(item);
              setMessage(null);
            }}
            aria-pressed={scope === item}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              scope === item
                ? "border-primary-500/60 bg-primary-600/10 text-primary-300"
                : "border-ink/10 bg-white admin-dark:bg-[#112544] text-heading hover:border-primary-500/40"
            }`}
          >
            {item === "ssc" ? "SSC Pages" : "HSC / Admission Pages"}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
          <p className="text-sm text-red-400">Failed to load the filter options.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd]"
          >
            Retry
          </button>
        </div>
      ) : loading || !current ? (
        <AccessLoading label="Loading options…" />
      ) : (
        <>
          <ul className="mt-6 space-y-2">
            {current.map((option, index) => (
              <li
                key={`${scope}-${index}`}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-4"
              >
                <span className="w-24 shrink-0">
                  <label className="sr-only" htmlFor={`opt-id-${index}`}>Option id</label>
                  <input
                    id={`opt-id-${index}`}
                    value={option.id}
                    disabled={option.id === "all"}
                    onChange={(event) => updateOption(index, { id: event.target.value })}
                    className={inputClass}
                    placeholder="id"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <label className="sr-only" htmlFor={`opt-label-${index}`}>Option label</label>
                  <input
                    id={`opt-label-${index}`}
                    value={option.label}
                    onChange={(event) => updateOption(index, { label: event.target.value })}
                    className={inputClass}
                    placeholder="Label shown on the pill"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={option.id === "all" || busy}
                  title={option.id === "all" ? "The All Batch option cannot be removed" : "Remove option"}
                  className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addOption}
              disabled={busy}
              className="rounded-xl border border-ink/15 px-4 py-2 text-xs font-bold text-heading transition hover:border-[#93c5fd]"
            >
              + Add Option
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="rounded-xl bg-primary-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Filter"}
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
            Option id must match the course batch ids (e.g. a course with batch
            &ldquo;hsc-27&rdquo; shows under the option with id &ldquo;hsc-27&rdquo;). The first row is
            always the &ldquo;All Batch&rdquo; filter.
          </p>

          {message && (
            <p
              role="status"
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                message.kind === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {message.text}
            </p>
          )}
        </>
      )}
    </section>
  );
}
