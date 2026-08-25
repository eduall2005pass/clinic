"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { ReviewRecord } from "@/lib/reviews-store";

type ReviewDraft = {
  id: string;
  studentName: string;
  courseName: string;
  batchLabel: string;
  rating: number;
  text: string;
  isPublished: boolean;
  studentAvatar: string | null;
};

type AddForm = {
  studentName: string;
  courseName: string;
  batchLabel: string;
  rating: number;
  text: string;
  isPublished: boolean;
  photo: File | null;
};

const EMPTY_ADD: AddForm = {
  studentName: "",
  courseName: "",
  batchLabel: "",
  rating: 5,
  text: "",
  isPublished: true,
  photo: null,
};

function Stars({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`Rate ${star} out of 5`}
          onClick={() => onChange?.(star)}
          className={`text-xl leading-none transition ${
            star <= value
              ? "text-primary-500"
              : "text-zinc-300 admin-dark:text-zinc-700"
          } ${onChange && !disabled ? "hover:scale-110" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewsManagementPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [adding, setAdding] = useState(false);
  const addPhotoRef = useRef<HTMLInputElement>(null);

  // Edit state per review
  const [editDrafts, setEditDrafts] = useState<Record<string, Partial<ReviewDraft>>>({});
  const [editPhotos, setEditPhotos] = useState<Record<string, File>>({});
  const editPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Load all reviews
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch("/api/reviews/all", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = (await res.json()) as { reviews?: ReviewRecord[] };
        if (!cancelled && data.reviews) {
          setReviews(
            data.reviews.map((record) => ({
              id: record.id,
              studentName: record.studentName,
              courseName: record.courseName,
              batchLabel: record.batchLabel,
              rating: record.rating,
              text: record.text,
              isPublished: record.isPublished,
              studentAvatar: record.studentAvatar,
            })),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus, user]);

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && loading)) {
    return <AccessLoading label="Loading reviews…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Reviews management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!reviews) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load reviews. Please refresh the page.
        </p>
      </section>
    );
  }

  function moveReview(index: number, direction: -1 | 1) {
    setReviews((prev) => {
      if (!prev) return prev;
      const items = [...prev];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }

  async function handleAdd() {
    if (!user) return;
    if (addForm.studentName.trim().length === 0 || addForm.text.trim().length === 0) {
      toast.showToast("error", "Student name and review text are required.");
      return;
    }
    setAdding(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("student_name", addForm.studentName.trim());
      formData.append("text", addForm.text.trim());
      formData.append("rating", String(addForm.rating));
      formData.append("is_published", addForm.isPublished ? "true" : "false");
      if (addForm.courseName.trim()) formData.append("course_name", addForm.courseName.trim());
      if (addForm.batchLabel.trim()) formData.append("batch_label", addForm.batchLabel.trim());
      if (addForm.photo) formData.append("photo", addForm.photo);

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as { error?: string; reviews?: ReviewRecord[] };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to add the review.");
        return;
      }
      setReviews(
        (data.reviews ?? []).map((record) => ({
          id: record.id,
          studentName: record.studentName,
          courseName: record.courseName,
          batchLabel: record.batchLabel,
          rating: record.rating,
          text: record.text,
          isPublished: record.isPublished,
          studentAvatar: record.studentAvatar,
        })),
      );
      setAddForm(EMPTY_ADD);
      if (addPhotoRef.current) addPhotoRef.current.value = "";
      toast.showToast(
        "success",
        addForm.isPublished
          ? "Review added and published on the live website."
          : "Review added as hidden.",
      );
    } catch {
      toast.showToast("error", "Failed to add the review.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(review: ReviewDraft) {
    setEditingId(review.id);
    setEditDrafts((prev) => ({
      ...prev,
      [review.id]: {
        studentName: review.studentName,
        courseName: review.courseName,
        batchLabel: review.batchLabel,
        rating: review.rating,
        text: review.text,
      },
    }));
  }

  function patchEdit(id: string, patch: Partial<ReviewDraft>) {
    setEditDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSaveEdit(review: ReviewDraft) {
    if (!user) return;
    const draft = editDrafts[review.id];
    if (!draft) return;
    const photo = editPhotos[review.id];
    setBusyIds((prev) => new Set(prev).add(review.id));
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("id", review.id);
      formData.append("student_name", (draft.studentName ?? "").trim());
      formData.append("text", (draft.text ?? "").trim());
      formData.append("rating", String(draft.rating ?? review.rating));
      formData.append("is_published", review.isPublished ? "true" : "false");
      formData.append("course_name", (draft.courseName ?? "").trim());
      formData.append("batch_label", (draft.batchLabel ?? "").trim());
      if (photo) formData.append("photo", photo);

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as { error?: string; reviews?: ReviewRecord[] };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to save the review.");
        return;
      }
      const saved = data.reviews?.find((item) => item.id === review.id);
      setReviews((prev) =>
        prev
          ? prev.map((item) =>
              item.id === review.id
                ? {
                    ...item,
                    studentName: saved?.studentName ?? item.studentName,
                    courseName: saved?.courseName ?? item.courseName,
                    batchLabel: saved?.batchLabel ?? item.batchLabel,
                    rating: saved?.rating ?? item.rating,
                    text: saved?.text ?? item.text,
                    studentAvatar: saved?.studentAvatar ?? item.studentAvatar,
                  }
                : item,
            )
          : prev,
      );
      setEditingId(null);
      setEditPhotos((prev) => {
        const next = { ...prev };
        delete next[review.id];
        return next;
      });
      const ref = editPhotoRefs.current[review.id];
      if (ref) ref.value = "";
      toast.showToast("success", "Review updated.");
    } catch {
      toast.showToast("error", "Failed to save the review.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  }

  async function togglePublished(review: ReviewDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(review.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviews", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: [{ id: review.id, isPublished: !review.isPublished }],
        }),
      });
      if (!response.ok) {
        toast.showToast("error", "Failed to update the review.");
        return;
      }
      setReviews((prev) =>
        prev
          ? prev.map((item) =>
              item.id === review.id ? { ...item, isPublished: !item.isPublished } : item,
            )
          : prev,
      );
      toast.showToast(
        "success",
        !review.isPublished ? "Review approved — now live." : "Review hidden.",
      );
    } catch {
      toast.showToast("error", "Failed to update the review.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  }

  async function handleDelete(review: ReviewDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(review.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviews", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: review.id }),
      });
      const data = (await response.json()) as { error?: string; reviews?: ReviewRecord[] };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the review.");
        return;
      }
      setReviews(
        (data.reviews ?? []).map((record) => ({
          id: record.id,
          studentName: record.studentName,
          courseName: record.courseName,
          batchLabel: record.batchLabel,
          rating: record.rating,
          text: record.text,
          isPublished: record.isPublished,
          studentAvatar: record.studentAvatar,
        })),
      );
      toast.showToast("success", "Review deleted.");
    } catch {
      toast.showToast("error", "Failed to delete the review.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  }

  async function handleSaveOrder() {
    if (!user || !reviews) return;
    setSaving(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviews", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order: reviews.map((review) => review.id) }),
      });
      if (!response.ok) {
        toast.showToast("error", "Failed to save the order.");
        return;
      }
      toast.showToast("success", "Display order saved. Live website updated.");
    } catch {
      toast.showToast("error", "Failed to save the order.");
    } finally {
      setSaving(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500/60 focus:bg-white admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100 disabled:opacity-60";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          Reviews Section
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Add, edit, approve or hide student reviews shown on the homepage.
          Approved reviews go live immediately after saving.
        </p>
      </header>

      {/* Add review */}
      <div className={`${cardClass} mt-6`}>
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          Add New Review
        </h3>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Student Name *</span>
              <input
                type="text"
                value={addForm.studentName}
                maxLength={255}
                onChange={(event) => setAddForm({ ...addForm, studentName: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Rating *</span>
              <div className="mt-2">
                <Stars
                  value={addForm.rating}
                  onChange={(value) => setAddForm({ ...addForm, rating: value })}
                />
              </div>
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Review Text *</span>
            <textarea
              value={addForm.text}
              rows={3}
              maxLength={2000}
              onChange={(event) => setAddForm({ ...addForm, text: event.target.value })}
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Course (optional)</span>
              <input
                type="text"
                value={addForm.courseName}
                maxLength={255}
                placeholder="HSC Biology"
                onChange={(event) => setAddForm({ ...addForm, courseName: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Batch (optional)</span>
              <input
                type="text"
                value={addForm.batchLabel}
                maxLength={100}
                placeholder="Batch 2025"
                onChange={(event) => setAddForm({ ...addForm, batchLabel: event.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Student Photo</span>
            <input
              ref={addPhotoRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setAddForm({ ...addForm, photo: event.target.files?.[0] ?? null })}
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
            />
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
            <input
              type="checkbox"
              checked={addForm.isPublished}
              onChange={(event) => setAddForm({ ...addForm, isPublished: event.target.checked })}
              className="h-4 w-4 accent-primary-600"
            />
            Publish immediately
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-fit rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add Review"}
          </button>
        </div>
      </div>

      {/* Existing reviews */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          All Reviews ({reviews.length})
        </h3>
        <button
          type="button"
          onClick={handleSaveOrder}
          disabled={saving}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:opacity-60 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
        >
          {saving ? "Saving…" : "Save Order"}
        </button>
      </div>

      <ul className="mt-3 space-y-3">
        {reviews.length === 0 && (
          <li className={`${cardClass}`}>
            <p className="py-4 text-center text-sm font-semibold text-zinc-500">
              No reviews yet. Add the first one above.
            </p>
          </li>
        )}
        {reviews.map((review, index) => {
          const busy = busyIds.has(review.id);
          const editing = editingId === review.id;
          const draft = editDrafts[review.id] ?? {};
          const editPhoto = editPhotos[review.id];
          return (
            <li key={review.id} className={`${cardClass} ${review.isPublished ? "" : "opacity-75"}`}>
              <div className="flex flex-wrap items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    editPhoto
                      ? URL.createObjectURL(editPhoto)
                      : review.studentAvatar ?? "/avatars/student.svg"
                  }
                  alt={review.studentName}
                  className="h-12 w-12 shrink-0 rounded-full border border-neutral-200 object-cover admin-dark:border-zinc-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                    {review.studentName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {[review.courseName, review.batchLabel].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Stars value={review.rating} disabled />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move review ${index + 1} up`}
                    onClick={() => moveReview(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move review ${index + 1} down`}
                    onClick={() => moveReview(index, 1)}
                    disabled={index === reviews.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublished(review)}
                    disabled={busy}
                    className={`ml-1 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                      review.isPublished
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 admin-dark:text-emerald-400"
                        : "border-zinc-300 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-400"
                    }`}
                  >
                    {review.isPublished ? "Approved" : "Hidden"}
                  </button>
                </div>
              </div>

              {!editing ? (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600 admin-dark:text-zinc-300">
                  {review.text}
                </p>
              ) : (
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Student Name</span>
                      <input
                        type="text"
                        value={draft.studentName ?? ""}
                        maxLength={255}
                        onChange={(event) => patchEdit(review.id, { studentName: event.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Rating</span>
                      <div className="mt-2">
                        <Stars
                          value={draft.rating ?? review.rating}
                          onChange={(value) => patchEdit(review.id, { rating: value })}
                        />
                      </div>
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Review Text</span>
                    <textarea
                      value={draft.text ?? ""}
                      rows={3}
                      maxLength={2000}
                      onChange={(event) => patchEdit(review.id, { text: event.target.value })}
                      className={`${inputClass} resize-none`}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Course</span>
                      <input
                        type="text"
                        value={draft.courseName ?? ""}
                        maxLength={255}
                        onChange={(event) => patchEdit(review.id, { courseName: event.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Batch</span>
                      <input
                        type="text"
                        value={draft.batchLabel ?? ""}
                        maxLength={100}
                        onChange={(event) => patchEdit(review.id, { batchLabel: event.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Replace Photo</span>
                    <input
                      ref={(el) => {
                        editPhotoRefs.current[review.id] = el;
                      }}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file)
                          setEditPhotos((prev) => ({ ...prev, [review.id]: file }));
                      }}
                      className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
                    />
                  </label>
                </div>
              )}

              {/* Row actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 admin-dark:border-zinc-800">
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => startEdit(review)}
                    disabled={busy}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(review)}
                      disabled={busy}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-40"
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={busy}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:bg-neutral-50 disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:text-zinc-300 admin-dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(review)}
                  disabled={busy}
                  className="ml-auto rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/15 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {notice && (
        <p
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this review?"
        message={
          deleteTarget
            ? `"${deleteTarget.studentName}"'s review will be removed permanently.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
