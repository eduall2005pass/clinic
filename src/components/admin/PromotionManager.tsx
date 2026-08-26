"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { Promotion } from "@/lib/promotions";

type PromotionKind = "offer" | "campaign";

type Draft = {
  id: string;
  title: string;
  description: string;
  linkHref: string;
  isActive: boolean;
  startAt: string; // datetime-local
  endAt: string;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDraft(promotion: Promotion): Draft {
  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description ?? "",
    linkHref: promotion.linkHref ?? "",
    isActive: promotion.isActive,
    startAt: toLocalInput(promotion.startAt),
    endAt: toLocalInput(promotion.endAt),
  };
}

export default function PromotionManager({
  kind,
  loadingLabel,
  heading,
  description,
}: {
  kind: PromotionKind;
  loadingLabel: string;
  heading: string;
  description: string;
}) {
  const apiKind = kind === "offer" ? "offers" : "campaigns";
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();

  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");
  const [items, setItems] = useState<Draft[] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Draft | null>(null);

  // Add form
  const [adding, setAdding] = useState(false);
  const [emptyForm, setEmptyForm] = useState<Draft>({
    id: "",
    title: "",
    description: "",
    linkHref: "",
    isActive: true,
    startAt: "",
    endAt: "",
  });

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
        if (!cancelled) setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load promotions
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch(`/api/promotions?kind=${apiKind}&all=1`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { promotions?: Promotion[] };
        if (!cancelled && data.promotions) {
          setItems(data.promotions.map(toDraft));
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user, apiKind]);

  function authHeaders(token: string) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function run<T>(id: string, action: () => Promise<T>): Promise<T | undefined> {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      return await action();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleAdd() {
    if (!user || !emptyForm.title.trim()) return;
    setAdding(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          kind,
          title: emptyForm.title,
          description: emptyForm.description,
          linkHref: emptyForm.linkHref,
          isActive: emptyForm.isActive,
          startAt: emptyForm.startAt || null,
          endAt: emptyForm.endAt || null,
        }),
      });
      const data = (await res.json()) as { error?: string; promotions?: Promotion[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to save.");
        return;
      }
      if (data.promotions) setItems(data.promotions.map(toDraft));
      setEmptyForm({
        id: "",
        title: "",
        description: "",
        linkHref: "",
        isActive: true,
        startAt: "",
        endAt: "",
      });
      toast.showToast("success", "Saved successfully.");
    } catch {
      toast.showToast("error", "Failed to save.");
    } finally {
      setAdding(false);
    }
  }

  function patchItem(id: string, patch: Partial<Draft>) {
    setItems((prev) =>
      prev ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) : prev,
    );
  }

  async function handleSaveItem(item: Draft) {
    if (!user || !item.title.trim()) {
      toast.showToast("error", "Title is required.");
      return;
    }
    setSavingIds((prev) => new Set(prev).add(item.id));
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          kind,
          id: item.id,
          title: item.title,
          description: item.description,
          linkHref: item.linkHref,
          isActive: item.isActive,
          startAt: item.startAt || null,
          endAt: item.endAt || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to save.");
        return;
      }
      toast.showToast("success", "Changes saved.");
    } catch {
      toast.showToast("error", "Failed to save.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleToggle(item: Draft) {
    if (!user) return;
    await run(`toggle-${item.id}`, async () => {
      const token = await user.getIdToken();
      const res = await fetch(`/api/promotions?kind=${apiKind}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          kind,
          updates: [{ id: item.id, isActive: !item.isActive }],
        }),
      });
      const data = (await res.json()) as { error?: string; promotions?: Promotion[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to update.");
        return;
      }
      if (data.promotions) setItems(data.promotions.map(toDraft));
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleReorder() {
    if (!user || !items) return;
    await run("reorder", async () => {
      const token = await user.getIdToken();
      const res = await fetch(`/api/promotions?kind=${apiKind}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ kind, order: items.map((item) => item.id) }),
      });
      if (!res.ok) toast.showToast("error", "Failed to save the order.");
    });
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    const target = deleteTarget;
    await run(target.id, async () => {
      const token = await user.getIdToken();
      const res = await fetch(`/api/promotions?kind=${apiKind}`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ id: target.id }),
      });
      const data = (await res.json()) as { error?: string; promotions?: Promotion[] };
      if (!res.ok) {
        toast.showToast("error", data.error ?? "Failed to delete.");
        return;
      }
      if (data.promotions) setItems(data.promotions.map(toDraft));
      toast.showToast("success", "Deleted.");
    });
    setDeleteTarget(null);
  }

  if (
    authLoading ||
    adminStatus === "checking" ||
    (adminStatus === "admin" && initialLoading)
  ) {
    return <AccessLoading label={loadingLabel} />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="This section is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-[#f8fbff] px-3 py-2 text-sm text-[#0b1e3a] outline-none transition placeholder:text-slate-400 focus:border-[#2f6bce]/60 focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100";
  const labelClass =
    "block text-xs font-semibold uppercase tracking-wider text-slate-400";
  const iconButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-slate-500 transition hover:border-[#93c5fd] hover:text-[#1a3a78] disabled:cursor-not-allowed disabled:opacity-30 admin-dark:border-zinc-700 admin-dark:text-slate-400";
  const cardClass =
    "rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 shadow-sm transition-colors duration-300 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1e3a] admin-dark:text-white">
          {heading}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 admin-dark:text-slate-400">
          {description}
        </p>
      </header>

      {/* Add new */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
          Add New
        </h3>
        <div className="mt-3 grid gap-3">
          <label className="block">
            <span className={labelClass}>Title</span>
            <input
              type="text"
              value={emptyForm.title}
              onChange={(e) =>
                setEmptyForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={kind === "offer" ? "e.g. 20% off HSC 26 courses" : "e.g. Admission Bootcamp 2026"}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Description</span>
            <textarea
              value={emptyForm.description}
              onChange={(e) =>
                setEmptyForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              placeholder="Short supporting text…"
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Link (optional)</span>
              <input
                type="text"
                value={emptyForm.linkHref}
                onChange={(e) =>
                  setEmptyForm((prev) => ({ ...prev, linkHref: e.target.value }))
                }
                placeholder="/courses or https://…"
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-3 self-end rounded-xl border border-neutral-200 px-4 py-2.5 admin-dark:border-zinc-700">
              <input
                type="checkbox"
                checked={emptyForm.isActive}
                onChange={(e) =>
                  setEmptyForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4 accent-primary-600"
              />
              <span className="text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
                Active
              </span>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Start date (optional)</span>
              <input
                type="datetime-local"
                value={emptyForm.startAt}
                onChange={(e) =>
                  setEmptyForm((prev) => ({ ...prev, startAt: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>End date (optional)</span>
              <input
                type="datetime-local"
                value={emptyForm.endAt}
                onChange={(e) =>
                  setEmptyForm((prev) => ({ ...prev, endAt: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !emptyForm.title.trim()}
            className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start"
          >
            {adding ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className={`${cardClass} mt-6 p-4 sm:p-5`}>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
          All ({items?.length ?? 0})
        </h3>

        {!items && (
          <p className="py-6 text-center text-sm font-semibold text-slate-500">Loading…</p>
        )}
        {items?.length === 0 && (
          <p className="py-8 text-center text-sm font-semibold text-slate-500">
            Nothing here yet. Add one above.
          </p>
        )}

        <ul className="mt-3 space-y-4">
          {items?.map((item, index) => (
            <li
              key={item.id}
              className={`rounded-xl border p-4 ${
                item.isActive
                  ? "border-neutral-200 bg-[#f8fbff] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]/60"
                  : "border-dashed border-neutral-300 bg-transparent opacity-70 admin-dark:border-zinc-700"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    item.isActive
                      ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                      : "bg-zinc-200 text-slate-500 admin-dark:bg-zinc-700 admin-dark:text-zinc-300"
                  }`}
                >
                  {item.isActive ? "Active" : "Inactive"}
                </span>
                <span className="ml-auto flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      moveItem(index, -1);
                      handleReorder();
                    }}
                    disabled={index === 0 || busyIds.has("reorder")}
                    aria-label="Move up"
                    className={iconButtonClass}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      moveItem(index, 1);
                      handleReorder();
                    }}
                    disabled={index === items.length - 1 || busyIds.has("reorder")}
                    aria-label="Move down"
                    className={iconButtonClass}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={busyIds.has(`toggle-${item.id}`)}
                    aria-label={item.isActive ? "Deactivate" : "Activate"}
                    className={iconButtonClass}
                  >
                    {item.isActive ? "⏸" : "▶"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-red-500 transition hover:border-red-500/60 hover:bg-red-500/10 admin-dark:border-zinc-700"
                  >
                    ✕
                  </button>
                </span>
              </div>

              <div className="mt-3 grid gap-3">
                <label className="block">
                  <span className={labelClass}>Title</span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => patchItem(item.id, { title: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Description</span>
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      patchItem(item.id, { description: e.target.value })
                    }
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Link</span>
                    <input
                      type="text"
                      value={item.linkHref}
                      onChange={(e) =>
                        patchItem(item.id, { linkHref: e.target.value })
                      }
                      placeholder="/courses or https://…"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex items-center gap-3 self-end rounded-xl border border-neutral-200 px-4 py-2.5 admin-dark:border-zinc-700">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) =>
                        patchItem(item.id, { isActive: e.target.checked })
                      }
                      className="h-4 w-4 accent-primary-600"
                    />
                    <span className="text-sm font-semibold text-slate-700 admin-dark:text-zinc-200">
                      Active
                    </span>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Start date</span>
                    <input
                      type="datetime-local"
                      value={item.startAt}
                      onChange={(e) =>
                        patchItem(item.id, { startAt: e.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>End date</span>
                    <input
                      type="datetime-local"
                      value={item.endAt}
                      onChange={(e) =>
                        patchItem(item.id, { endAt: e.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveItem(item)}
                  disabled={
                    savingIds.has(item.id) || busyIds.has(`toggle-${item.id}`)
                  }
                  className="self-start rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-zinc-600 transition hover:border-[#93c5fd] hover:text-[#1a3a78] disabled:opacity-50 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                >
                  {savingIds.has(item.id) ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this item?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be permanently removed from the website.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
