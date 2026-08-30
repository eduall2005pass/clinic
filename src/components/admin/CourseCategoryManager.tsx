"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { CourseCategory } from "@/lib/course-categories-store";

type Notice = { kind: "success" | "error"; text: string };

type Draft = {
  name: string;
  slug: string;
  description: string;
  href: string;
};

const emptyDraft: Draft = { name: "", slug: "", description: "", href: "" };

export default function CourseCategoryManager({
  loadingLabel,
}: {
  loadingLabel: string;
}) {
  const { user, authLoading } = useAuth();
  const searchParams = useSearchParams();
  const autoOpenAdd = searchParams.get("add") === "1";

  const [categories, setCategories] = useState<CourseCategory[] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft);
  const [addFile, setAddFile] = useState<File | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  const [deleteTarget, setDeleteTarget] = useState<CourseCategory | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

  // Load categories
  useEffect(() => {
    if (authLoading || !user || adminStatus !== "admin") return;
    if (autoOpenAdd) setAdding(true);
    let cancelled = false;
    async function load() {
      try {
        const token = await user!.getIdToken();
        const response = await fetch("/api/course-categories/all", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { categories?: CourseCategory[] };
        if (data.categories && !cancelled) setCategories(data.categories);
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
    return <AccessLoading label={loadingLabel} />;
  }

  if (adminCheck === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Category management is restricted to authorized administrators. Your account does not have permission to change it."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  function authHeaders(token: string): HeadersInit {
    return { Authorization: `Bearer ${token}` };
  }

  async function request(
    input: RequestInfo,
    init: RequestInit,
    successText: string,
  ): Promise<boolean> {
    if (!user) return false;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const headers = { ...authHeaders(token), ...(init.headers ?? {}) };
      const response = await fetch(input, { ...init, headers });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        categories?: CourseCategory[];
      } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Request failed." });
        return false;
      }
      if (data?.categories) setCategories(data.categories);
      setNotice({ kind: "success", text: successText });
      return true;
    } catch {
      setNotice({ kind: "error", text: "Request failed. Please try again." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (addDraft.name.trim().length === 0) {
      setNotice({ kind: "error", text: "Category name is required." });
      return;
    }
    const formData = new FormData();
    formData.append("name", addDraft.name.trim());
    if (addDraft.slug.trim()) formData.append("slug", addDraft.slug.trim());
    if (addDraft.description.trim())
      formData.append("description", addDraft.description.trim());
    if (addDraft.href.trim()) formData.append("href", addDraft.href.trim());
    if (addFile) formData.append("file", addFile);

    const ok = await request(
      "/api/course-categories",
      { method: "POST", body: formData },
      "Category created. It is now live on the website.",
    );
    if (ok) {
      setAdding(false);
      setAddDraft(emptyDraft);
      setAddFile(null);
    }
  }

  function startEdit(category: CourseCategory) {
    setEditingId(category.id);
    setEditDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      href: category.href,
    });
    setNotice(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    if (editDraft.name.trim().length === 0) {
      setNotice({ kind: "error", text: "Category name is required." });
      return;
    }
    const ok = await request(
      "/api/course-categories",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editDraft.name.trim(),
          slug: editDraft.slug.trim(),
          description: editDraft.description.trim(),
          href: editDraft.href.trim() || null,
        }),
      },
      "Category updated.",
    );
    if (ok) setEditingId(null);
  }

  async function toggleActive(category: CourseCategory) {
    await request(
      "/api/course-categories",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id, isActive: !category.isActive }),
      },
      category.isActive
        ? `"${category.name}" disabled — hidden from the website.`
        : `"${category.name}" enabled — visible on the website.`,
    );
  }

  async function move(index: number, direction: -1 | 1) {
    if (!categories) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    await request(
      "/api/course-categories",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((category) => category.id) }),
      },
      "Display order updated.",
    );
  }

  async function changeImage(category: CourseCategory, file: File) {
    const formData = new FormData();
    formData.append("id", category.id);
    formData.append("file", file);
    await request(
      "/api/course-categories",
      { method: "PATCH", body: formData },
      "Category image updated.",
    );
  }

  async function removeImage(category: CourseCategory) {
    await request(
      "/api/course-categories",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id, removeImage: true }),
      },
      "Category image removed.",
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const ok = await request(
      "/api/course-categories",
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      },
      "Category deleted.",
    );
    if (ok) setDeleteTarget(null);
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60";
  const iconButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-[#93c5fd] hover:text-heading disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Courses
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">Categories</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Organize courses into categories for the website — create, edit,
            delete, enable or disable categories, change their image and change
            their display order. Changes go live immediately.
          </p>
        </header>

        {!categories ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load the current categories. Please refresh the page.
          </p>
        ) : (
          <>
            {/* Add form */}
            <div className="mt-8 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">New Category</h2>
              {adding ? (
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">Name *</span>
                    <input
                      type="text"
                      value={addDraft.name}
                      onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })}
                      placeholder="e.g. Admission Courses"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">Slug (optional)</span>
                    <input
                      type="text"
                      value={addDraft.slug}
                      onChange={(e) => setAddDraft({ ...addDraft, slug: e.target.value })}
                      placeholder="auto-generated from the name"
                      className={inputClass}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-neutral-500">Description</span>
                    <textarea
                      value={addDraft.description}
                      onChange={(e) =>
                        setAddDraft({ ...addDraft, description: e.target.value })
                      }
                      rows={2}
                      placeholder="Short description shown on the card…"
                      className={`${inputClass} resize-none`}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-neutral-500">
                      Link (optional — defaults to /courses/&lt;slug&gt;)
                    </span>
                    <input
                      type="text"
                      value={addDraft.href}
                      onChange={(e) => setAddDraft({ ...addDraft, href: e.target.value })}
                      placeholder="/courses/academic"
                      className={inputClass}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-neutral-500">Image (optional)</span>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-400"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3 sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={busy}
                      className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setAddDraft(emptyDraft);
                        setAddFile(null);
                      }}
                      disabled={busy}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  disabled={busy}
                  className="mt-4 rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-[#93c5fd] hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add New Category
                </button>
              )}
            </div>

            {/* Category list */}
            <section className="mt-6 rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6">
              <h2 className="text-lg font-bold text-heading">Category List</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Use the checkbox to enable or disable a category, the arrows to
                change display order, the pencil to edit and ✕ to delete.
              </p>

              {categories.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
                  No categories yet. Use &quot;+ Add New Category&quot; above to create one.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {categories.map((category, index) => (
                    <div
                      key={category.id}
                      className={`rounded-xl border px-4 py-3 transition ${
                        category.isActive
                          ? "border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547]"
                          : "border-dashed border-ink/15 bg-white admin-dark:bg-[#112544] opacity-60"
                      }`}
                    >
                      {editingId === category.id ? (
                        <div className="grid gap-4">
                          <label className="block">
                            <span className="text-xs font-semibold text-neutral-500">Name</span>
                            <input
                              type="text"
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, name: e.target.value })
                              }
                              className={inputClass}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-neutral-500">Slug</span>
                            <input
                              type="text"
                              value={editDraft.slug}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, slug: e.target.value })
                              }
                              className={inputClass}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-neutral-500">Description</span>
                            <textarea
                              value={editDraft.description}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  description: e.target.value,
                                })
                              }
                              rows={2}
                              className={`${inputClass} resize-none`}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-neutral-500">Link</span>
                            <input
                              type="text"
                              value={editDraft.href}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, href: e.target.value })
                              }
                              placeholder="/courses/<slug>"
                              className={inputClass}
                            />
                          </label>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={busy}
                              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Update Category
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={busy}
                              className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={category.isActive}
                            onChange={() => toggleActive(category)}
                            disabled={busy}
                            className="mt-1 h-4 w-4 shrink-0 accent-primary-600"
                            aria-label={`Enable ${category.name}`}
                          />
                          {category.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.imageUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-600/15 text-xs font-bold text-primary-400">
                              {index + 1}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold text-heading">
                              {category.name}
                            </span>
                            <span className="block break-all text-xs text-neutral-600">
                              /{category.slug} → {category.href}
                            </span>
                            {category.description && (
                              <span className="mt-0.5 block break-words text-xs leading-relaxed text-neutral-500">
                                {category.description}
                              </span>
                            )}
                            {!category.isActive && (
                              <span className="mt-1 inline-block rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
                                Disabled
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 flex-wrap gap-1">
                            <input
                              data-image-input={category.id}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) changeImage(category, file);
                                e.target.value = "";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                document
                                  .querySelector<HTMLInputElement>(
                                    `input[data-image-input="${category.id}"]`,
                                  )
                                  ?.click();
                              }}
                              aria-label={`Change image of ${category.name}`}
                              title="Change image"
                              className={iconButtonClass}
                            >
                              🖼
                            </button>
                            {category.imageUrl && (
                              <button
                                type="button"
                                onClick={() => removeImage(category)}
                                disabled={busy}
                                aria-label={`Remove image of ${category.name}`}
                                title="Remove image"
                                className={iconButtonClass}
                              >
                                ⌫
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(category)}
                              disabled={busy}
                              aria-label={`Edit ${category.name}`}
                              title="Edit"
                              className={iconButtonClass}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => move(index, -1)}
                              disabled={busy || index === 0}
                              aria-label={`Move ${category.name} up`}
                              className={iconButtonClass}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => move(index, 1)}
                              disabled={busy || index === categories.length - 1}
                              aria-label={`Move ${category.name} down`}
                              className={iconButtonClass}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(category)}
                              aria-label={`Delete ${category.name}`}
                              title="Delete"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
                            >
                              ✕
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
          </>
        )}

        <AdminConfirmDialog
          open={deleteTarget !== null}
          title="Delete this category?"
          message={
            deleteTarget
              ? `"${deleteTarget.name}" will be removed from the course system and the website. This cannot be undone.`
              : ""
          }
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      </section>
    </main>
  );
}
