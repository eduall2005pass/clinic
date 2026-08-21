"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { Faq } from "@/lib/faq";

type Notice = { kind: "success" | "error"; text: string };

export default function FaqManager({
  loadingLabel,
  heading,
  description,
}: {
  loadingLabel: string;
  heading: string;
  description: string;
}) {
  const { user, authLoading } = useAuth();

  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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

  // Load FAQs
  useEffect(() => {
    if (authLoading || !user || adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const token = await user!.getIdToken();
        const response = await fetch("/api/faqs?all=1", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { faqs?: Faq[] };
        if (data.faqs && !cancelled) setFaqs(data.faqs);
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
        message="FAQ management is restricted to authorized administrators. Your account does not have permission to change it."
        actionLabel="Back to Home"
        actionHref="/admin"
      />
    );
  }

  function startAdd() {
    setEditingId("new");
    setDraftQuestion("");
    setDraftAnswer("");
    setNotice(null);
  }

  function startEdit(faq: Faq) {
    setEditingId(faq.id);
    setDraftQuestion(faq.question);
    setDraftAnswer(faq.answer);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftQuestion("");
    setDraftAnswer("");
  }

  function commitEdit() {
    if (draftQuestion.trim().length === 0 || draftAnswer.trim().length === 0) {
      setNotice({ kind: "error", text: "Both the question and answer are required." });
      return;
    }
    if (editingId === "new") {
      setFaqs((prev) => [
        ...(prev ?? []),
        {
          id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          question: draftQuestion.trim(),
          answer: draftAnswer.trim(),
          order: (prev?.length ?? 0) + 1,
          status: "published",
        },
      ]);
    } else {
      setFaqs((prev) =>
        (prev ?? []).map((faq) =>
          faq.id === editingId
            ? {
                ...faq,
                question: draftQuestion.trim(),
                answer: draftAnswer.trim(),
              }
            : faq,
        ),
      );
    }
    cancelEdit();
  }

  function toggleFaq(id: string) {
    setFaqs((prev) =>
      (prev ?? []).map((faq) =>
        faq.id === id
          ? { ...faq, status: faq.status === "published" ? "unpublished" : "published" }
          : faq,
      ),
    );
  }

  function moveFaq(index: number, direction: -1 | 1) {
    setFaqs((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeFaq(id: string) {
    setFaqs((prev) => (prev ?? []).filter((faq) => faq.id !== id));
    setDeleteTargetId(null);
  }

  async function handleSave() {
    if (!user || !faqs) return;
    setBusy(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/faqs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          faqs: faqs.map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            status: faq.status,
          })),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        faqs?: Faq[];
      } | null;
      if (!response.ok) {
        setNotice({ kind: "error", text: data?.error ?? "Failed to save the FAQs." });
        return;
      }
      if (data?.faqs) setFaqs(data.faqs);
      setNotice({
        kind: "success",
        text: "FAQs saved. Changes are now live on the website.",
      });
    } catch {
      setNotice({ kind: "error", text: "Failed to save the FAQs." });
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-ink/10 bg-dark-850 px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-primary-500/60";
  const iconButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 text-neutral-400 transition hover:border-primary-500/60 hover:text-heading disabled:cursor-not-allowed disabled:opacity-30";

  const deleteTarget = faqs?.find((faq) => faq.id === deleteTargetId) ?? null;

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Admin Panel — Website
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-heading">{heading}</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            {description}
          </p>
        </header>

        {!faqs ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load the current FAQs. Please refresh the page.
          </p>
        ) : (
          <>
            {/* Add / edit form */}
            <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6">
              <h2 className="text-lg font-bold text-heading">
                {editingId === "new" ? "Add FAQ" : editingId ? "Edit FAQ" : "New FAQ"}
              </h2>
              <div className="mt-5 grid gap-5">
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-500">Question</span>
                  <input
                    type="text"
                    value={editingId ? draftQuestion : ""}
                    onChange={(e) => setDraftQuestion(e.target.value)}
                    disabled={!editingId}
                    placeholder="e.g. What is MediSpark?"
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-500">Answer</span>
                  <textarea
                    value={editingId ? draftAnswer : ""}
                    onChange={(e) => setDraftAnswer(e.target.value)}
                    disabled={!editingId}
                    rows={3}
                    placeholder="Write a clear, helpful answer…"
                    className={`${inputClass} resize-none disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startAdd}
                  disabled={busy}
                  className="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-primary-500/60 hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add New FAQ
                </button>
                {editingId && (
                  <>
                    <button
                      type="button"
                      onClick={commitEdit}
                      disabled={busy}
                      className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {editingId === "new" ? "Add to List" : "Update Item"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={busy}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* FAQ list */}
            <section className="mt-6 rounded-2xl border border-ink/10 bg-dark-900 p-6">
              <h2 className="text-lg font-bold text-heading">FAQ List</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Toggle the checkbox to enable or disable an item, use the arrows
                to change display order, then press Save Changes.
              </p>

              {faqs.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-neutral-500">
                  No FAQs yet. Use &quot;+ Add New FAQ&quot; above to create one.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {faqs.map((faq, index) => (
                    <div
                      key={faq.id}
                      className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 transition ${
                        faq.status === "published"
                          ? "border-ink/10 bg-dark-850"
                          : "border-dashed border-ink/15 bg-dark-900 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={faq.status === "published"}
                        onChange={() => toggleFaq(faq.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-primary-600"
                        aria-label={`Enable ${faq.question}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-semibold text-heading">
                          {index + 1}. {faq.question}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-relaxed text-neutral-500">
                          {faq.answer}
                        </span>
                        {faq.status === "unpublished" && (
                          <span className="mt-1 inline-block rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
                            Disabled
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(faq)}
                          disabled={editingId === faq.id}
                          aria-label={`Edit ${faq.question}`}
                          className={iconButtonClass}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFaq(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${faq.question} up`}
                          className={iconButtonClass}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFaq(index, 1)}
                          disabled={index === faqs.length - 1}
                          aria-label={`Move ${faq.question} down`}
                          className={iconButtonClass}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(faq.id)}
                          aria-label={`Delete ${faq.question}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
                        >
                          ✕
                        </button>
                      </span>
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

        <AdminConfirmDialog
          open={deleteTarget !== null}
          title="Delete this FAQ?"
          message={
            deleteTarget
              ? `"${deleteTarget.question}" will be removed from the website after you save.`
              : ""
          }
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            if (deleteTargetId) removeFaq(deleteTargetId);
          }}
          onClose={() => setDeleteTargetId(null)}
        />
      </section>
    </main>
  );
}
