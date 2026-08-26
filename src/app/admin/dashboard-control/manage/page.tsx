"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { renderDashboardIcon } from "@/lib/dashboard";
import type { DashboardCard } from "@/lib/dashboard-cards";

const ICON_OPTIONS = [
  "book",
  "exam",
  "star",
  "play",
  "clock",
  "chart",
  "users",
  "trophy",
  "target",
  "bell",
  "link",
] as const;

/**
 * Admin → Dashboard Control. Manages the Student Dashboard cards stored in
 * MySQL: + Add Card, edit, activate/deactivate and delete. The student
 * dashboard reads this list live.
 */
export default function DashboardCardManagerPage() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Add form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [href, setHref] = useState("/dashboard/");
  const [icon, setIcon] = useState<string>("book");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editKey, setEditKey] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", description: "", href: "", icon: "book" });

  async function headers(): Promise<Record<string, string>> {
    if (!user) throw new Error("Not signed in");
    return {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    };
  }

  const load = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/dashboard-cards", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { cards?: DashboardCard[] };
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  function applyCards(data: unknown, success?: string) {
    const list = (data as { cards?: DashboardCard[] })?.cards;
    if (Array.isArray(list)) setCards(list);
    if (success) toast.showToast("success", success);
  }

  async function addCard() {
    if (title.trim().length < 2) {
      toast.showToast("error", "Card title must be at least 2 characters.");
      return;
    }
    if (!href.trim().startsWith("/")) {
      toast.showToast("error", "Link must be an internal path starting with /.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/dashboard-cards", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          href: href.trim(),
          icon,
        }),
      });
      const data = (await res.json()) as { error?: string; cards?: DashboardCard[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to add the card.");
        return;
      }
      applyCards(data, `Card "${title.trim()}" added.`);
      setTitle("");
      setDescription("");
      setHref("/dashboard/");
      setIcon("book");
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setAdding(false);
    }
  }

  async function patchCard(body: Record<string, unknown>, success: string) {
    setBusyKey(String(body.key ?? ""));
    try {
      const res = await fetch("/api/admin/dashboard-cards", {
        method: "PATCH",
        headers: await headers(),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update the card.");
        return;
      }
      applyCards(data, success);
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteCard(card: DashboardCard) {
    if (!window.confirm(`Delete the "${card.title}" card from every student dashboard?`))
      return;
    setBusyKey(card.key);
    try {
      const res = await fetch(
        `/api/admin/dashboard-cards?key=${encodeURIComponent(card.key)}`,
        { method: "DELETE", headers: await headers() },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the card.");
        return;
      }
      applyCards(data, `Card "${card.title}" deleted.`);
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setBusyKey(null);
    }
  }

  function startEdit(card: DashboardCard) {
    setEditKey(card.key);
    setEdit({
      title: card.title,
      description: card.description,
      href: card.href,
      icon: card.icon,
    });
  }

  async function saveEdit(key: string) {
    if (edit.title.trim().length < 2 || !edit.href.trim().startsWith("/")) {
      toast.showToast("error", "A valid title and internal link are required.");
      return;
    }
    await patchCard({ key, ...edit, title: edit.title.trim(), href: edit.href.trim() }, "Card updated.");
    setEditKey(null);
  }

  if (authLoading || loading) {
    return <AccessLoading label="Loading Dashboard Control…" />;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Dashboard Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage the cards every student sees on their dashboard — Favorites,
        Recently Viewed and any approved custom card. Changes appear on the
        student dashboard immediately.
      </p>

      {/* + Add Card */}
      <div className="mt-8 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">+ Add Card</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Favorites"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Link (internal path)
            </span>
            <input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="/dashboard/favourites"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Description
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short helper text shown on the card"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Icon
            </span>
            <select
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm capitalize text-heading outline-none focus:border-[#2f6bce]/60"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void addCard()}
              disabled={adding}
              className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 disabled:opacity-50"
            >
              {adding ? "Adding…" : "+ Add Card"}
            </button>
          </div>
        </div>
      </div>

      {/* Card list */}
      <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">
          Cards ({cards.length})
        </h2>

        {loadError ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
            <p className="text-sm text-red-400">Failed to load the cards.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd]"
            >
              Retry
            </button>
          </div>
        ) : cards.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No dashboard cards yet — students will see nothing. Add one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {cards.map((card) => {
              const busy = busyKey === card.key;
              const isEditing = editKey === card.key;
              return (
                <li
                  key={card.key}
                  className="rounded-xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400">
                      {renderDashboardIcon(card.icon) as React.ReactNode}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-heading">
                        {card.title}{" "}
                        {!card.isActive && (
                          <span className="ml-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-300">
                            hidden
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {card.href} · order {card.order}
                        {card.description ? ` · ${card.description}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void patchCard(
                          { key: card.key, isActive: !card.isActive },
                          card.isActive ? "Card hidden." : "Card visible.",
                        )
                      }
                      disabled={busy}
                      aria-label={`Toggle ${card.title}`}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                        card.isActive ? "bg-emerald-500" : "bg-zinc-600"
                      } ${busy ? "opacity-50" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                          card.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditKey(null) : startEdit(card))}
                      disabled={busy}
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-[#93c5fd] disabled:opacity-50"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCard(card)}
                      disabled={busy}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-3 grid gap-3 border-t border-ink/10 pt-3 sm:grid-cols-2">
                      <input
                        value={edit.title}
                        onChange={(event) => setEdit({ ...edit, title: event.target.value })}
                        placeholder="Title"
                        className="rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
                      />
                      <input
                        value={edit.href}
                        onChange={(event) => setEdit({ ...edit, href: event.target.value })}
                        placeholder="/dashboard/…"
                        className="rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
                      />
                      <input
                        value={edit.description}
                        onChange={(event) =>
                          setEdit({ ...edit, description: event.target.value })
                        }
                        placeholder="Description"
                        className="rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-sm text-heading outline-none focus:border-[#2f6bce]/60"
                      />
                      <div className="flex gap-2">
                        <select
                          value={edit.icon}
                          onChange={(event) => setEdit({ ...edit, icon: event.target.value })}
                          className="w-full rounded-xl border border-ink/15 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3 py-2 text-sm capitalize text-heading outline-none focus:border-[#2f6bce]/60"
                        >
                          {ICON_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void saveEdit(card.key)}
                          disabled={busy}
                          className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
