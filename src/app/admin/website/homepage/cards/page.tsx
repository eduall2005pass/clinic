"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { HomeCard } from "@/lib/home-cards";

const WHY_ICONS = ["book", "exam", "chat", "chart", "video", "mentor"] as const;
const SUCCESS_ICONS = [
  "graduation",
  "exam",
  "users",
  "target",
  "trophy",
  "chart",
] as const;

type Section = "why" | "success";

/**
 * Homepage info-card manager — backs the "+ Add Card" buttons in
 * Admin → Home Control ("Why MediSpark" benefits & "Our Success" stats).
 * All CRUD goes through /api/admin/home-cards → MySQL.
 */
export default function HomePageCardsManager() {
  const toast = useAdminToast();
  const { user, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [section, setSection] = useState<Section>("why");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Add form
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>("book");
  const [adding, setAdding] = useState(false);

  const [editKey, setEditKey] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    title: "",
    value: "",
    description: "",
    icon: "book",
  });

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
      const res = await fetch("/api/admin/home-cards", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { cards?: HomeCard[] };
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  const sectionCards = cards.filter((card) => card.section === section);
  const iconOptions = section === "why" ? WHY_ICONS : SUCCESS_ICONS;

  async function addCard() {
    if (title.trim().length < 2) {
      toast.showToast("error", "Card title must be at least 2 characters.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/home-cards", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({
          section,
          title: title.trim(),
          value: value.trim(),
          description: description.trim(),
          icon,
        }),
      });
      const data = (await res.json()) as { error?: string; cards?: HomeCard[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to add the card.");
        return;
      }
      if (Array.isArray(data.cards)) setCards(data.cards);
      toast.showToast("success", `Card "${title.trim()}" added.`);
      setTitle("");
      setValue("");
      setDescription("");
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setAdding(false);
    }
  }

  async function patchCard(body: Record<string, unknown>, success: string) {
    setBusyKey(String(body.key ?? ""));
    try {
      const res = await fetch("/api/admin/home-cards", {
        method: "PATCH",
        headers: await headers(),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; cards?: HomeCard[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update the card.");
        return;
      }
      if (Array.isArray(data.cards)) setCards(data.cards);
      toast.showToast("success", success);
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteCard(card: HomeCard) {
    if (!window.confirm(`Delete the "${card.title}" card?`)) return;
    setBusyKey(card.key);
    try {
      const res = await fetch(
        `/api/admin/home-cards?key=${encodeURIComponent(card.key)}`,
        { method: "DELETE", headers: await headers() },
      );
      const data = (await res.json()) as { error?: string; cards?: HomeCard[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the card.");
        return;
      }
      if (Array.isArray(data.cards)) setCards(data.cards);
      toast.showToast("success", `Card "${card.title}" deleted.`);
    } catch {
      toast.showToast("error", "Network error.");
    } finally {
      setBusyKey(null);
    }
  }

  function startEdit(card: HomeCard) {
    setEditKey(card.key);
    setEdit({
      title: card.title,
      value: card.value ?? "",
      description: card.description,
      icon: card.icon,
    });
  }

  async function saveEdit(key: string) {
    if (edit.title.trim().length < 2) {
      toast.showToast("error", "A valid title is required.");
      return;
    }
    await patchCard({ key, ...edit, title: edit.title.trim() }, "Card updated.");
    setEditKey(null);
  }

  if (authLoading || loading) {
    return <AccessLoading label="Loading homepage cards…" />;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Homepage Cards</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage the &ldquo;Why MediSpark&rdquo; benefit cards and the
        &ldquo;Our Success&rdquo; stat cards shown on the Main Website.
      </p>

      {/* Section tabs */}
      <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
        {(["why", "success"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSection(item)}
            aria-pressed={section === item}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              section === item
                ? "border-primary-500/60 bg-primary-600/10 text-primary-300"
                : "border-ink/10 bg-dark-900 text-heading hover:border-primary-500/40"
            }`}
          >
            {item === "why" ? "Why MediSpark" : "Our Success"}
          </button>
        ))}
      </div>

      {/* + Add Card */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">+ Add Card</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Title{section === "success" ? " / Stat label" : ""}
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={section === "why" ? "e.g. Live Classes" : "e.g. Students Guided"}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
            />
          </label>
          {section === "success" && (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Stat Value
              </span>
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="e.g. 500+"
                className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Description
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short helper text shown on the card"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none focus:border-primary-500/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Icon
            </span>
            <select
              value={iconOptions.includes(icon as never) ? icon : iconOptions[0]}
              onChange={(event) => setIcon(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-dark-850 px-3.5 py-2.5 text-sm capitalize text-heading outline-none focus:border-primary-500/60"
            >
              {iconOptions.map((option) => (
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
      <div className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">
          Cards ({sectionCards.length})
        </h2>

        {loadError ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
            <p className="text-sm text-red-400">Failed to load the cards.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-primary-500/60"
            >
              Retry
            </button>
          </div>
        ) : sectionCards.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
            No cards in this section yet — add one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {sectionCards.map((card) => {
              const busy = busyKey === card.key;
              const isEditing = editKey === card.key;
              return (
                <li
                  key={card.key}
                  className="rounded-xl border border-ink/10 bg-dark-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-heading">
                        {card.title}
                        {card.value ? ` — ${card.value}` : ""}{" "}
                        {!card.isActive && (
                          <span className="ml-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-300">
                            hidden
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {card.description} · icon: {card.icon}
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
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-heading hover:border-primary-500/60 disabled:opacity-50"
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
                        onChange={(event) =>
                          setEdit({ ...edit, title: event.target.value })
                        }
                        placeholder="Title"
                        className="rounded-xl border border-ink/15 bg-dark-850 px-3 py-2 text-sm text-heading outline-none focus:border-primary-500/60"
                      />
                      {section === "success" && (
                        <input
                          value={edit.value}
                          onChange={(event) =>
                            setEdit({ ...edit, value: event.target.value })
                          }
                          placeholder="Stat value (e.g. 90%)"
                          className="rounded-xl border border-ink/15 bg-dark-850 px-3 py-2 text-sm text-heading outline-none focus:border-primary-500/60"
                        />
                      )}
                      <input
                        value={edit.description}
                        onChange={(event) =>
                          setEdit({ ...edit, description: event.target.value })
                        }
                        placeholder="Description"
                        className="rounded-xl border border-ink/15 bg-dark-850 px-3 py-2 text-sm text-heading outline-none focus:border-primary-500/60"
                      />
                      <div className="flex gap-2">
                        <select
                          value={
                            iconOptions.includes(edit.icon as never)
                              ? edit.icon
                              : iconOptions[0]
                          }
                          onChange={(event) =>
                            setEdit({ ...edit, icon: event.target.value })
                          }
                          className="w-full rounded-xl border border-ink/15 bg-dark-850 px-3 py-2 text-sm capitalize text-heading outline-none focus:border-primary-500/60"
                        >
                          {iconOptions.map((option) => (
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
