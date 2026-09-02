"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import { stripHtml, sanitizeFaqHtml } from "@/lib/faq-sanitize";
import { toVideoEmbed } from "@/lib/video-embed";
import type { Faq, FaqAnswerType, FaqStatus } from "@/lib/faq";

type Notice = { kind: "success" | "error"; text: string };
type StatusFilter = "all" | "published" | "unpublished" | "enabled" | "disabled";

const ANSWER_TYPE_LABELS: Record<FaqAnswerType, string> = {
  text: "Text",
  video: "Video",
  text_video: "Text + Video",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Live validation hint under the video URL field / inside the list. */
function VideoUrlHint({ url }: { url: string }) {
  if (!url.trim()) return null;
  const embed = toVideoEmbed(url);
  return embed ? (
    <p className="mt-1 text-[11px] font-semibold text-emerald-400">
      ✓ Supported embeddable video link ({embed.provider})
    </p>
  ) : (
    <p className="mt-1 text-[11px] font-semibold text-red-400">
      ✕ Unsupported link — use a YouTube (watch/share/Shorts), Vimeo or Google Drive URL
    </p>
  );
}

/** Responsive 16:9 player — direct files use <video> with a prominent
 *  overlay play button, others an iframe. */
export function FaqVideoPlayer({ url }: { url: string }) {
  const embed = toVideoEmbed(url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!embed) return null;
  return (
    <div className="mt-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-ink/10 bg-black shadow-lg shadow-black/30">
        {embed.provider === "direct" ? (
          <>
            <video
              ref={videoRef}
              src={embed.embedUrl}
              controls={playing}
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            >
              <track kind="captions" />
            </video>
            {!playing && (
              <button
                type="button"
                aria-label="Play video"
                onClick={() => {
                  setPlaying(true);
                  void videoRef.current?.play();
                }}
                className="group absolute inset-0 flex items-center justify-center bg-black/40 transition hover:bg-black/50"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-xl shadow-primary-900/50 transition group-hover:scale-110 group-hover:bg-primary-500 sm:h-20 sm:w-20">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-10 w-10">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            )}
          </>
        ) : (
          <iframe
            src={embed.embedUrl}
            title="FAQ video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-neutral-500 sm:text-sm">
        ভিডিওটি দেখুন এবং MediSpark-এর সকল সুবিধা সম্পর্কে সহজেই জেনে নিন।
      </p>
    </div>
  );
}

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [previewFaq, setPreviewFaq] = useState<Faq | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [adminStatus, setAdminStatus] = useState<
    "checking" | "admin" | "denied"
  >("checking");

  // Editor draft — null when closed.
  const [draft, setDraft] = useState<{
    id: string | null;
    question: string;
    answerHtml: string;
    videoUrl: string;
    answerType: FaqAnswerType;
    status: FaqStatus;
    isActive: boolean;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

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

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/faqs/all", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { faqs?: Faq[] };
      if (Array.isArray(data.faqs)) setFaqs(data.faqs);
    } catch {
      // keep previous state
    } finally {
      setInitialLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user || adminStatus !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, adminStatus, load]);

  const adminCheck = !authLoading && !user ? "denied" : adminStatus;

  /** Persist the full list — every action saves immediately and goes live. */
  const persist = useCallback(
    async (next: Faq[]) => {
      if (!user) return;
      setFaqs(next); // optimistic
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
            faqs: next.map((faq) => ({
              id: faq.id,
              question: faq.question,
              answer: faq.answer,
              videoUrl: faq.videoUrl,
              answerType: faq.answerType,
              status: faq.status,
              isActive: faq.isActive,
            })),
          }),
        });
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          faqs?: Faq[];
        } | null;
        if (!response.ok) {
          setNotice({ kind: "error", text: data?.error ?? "Failed to save the FAQs." });
          void load();
          return;
        }
        if (Array.isArray(data?.faqs)) setFaqs(data.faqs);
        setNotice({ kind: "success", text: "Saved — changes are live on the website." });
      } catch {
        setNotice({ kind: "error", text: "Failed to save the FAQs." });
        void load();
      } finally {
        setBusy(false);
      }
    },
    [user, load],
  );

  function startAdd() {
    setDraft({
      id: null,
      question: "",
      answerHtml: "",
      videoUrl: "",
      answerType: "text",
      status: "published",
      isActive: true,
    });
    setNotice(null);
  }

  function startEdit(faq: Faq) {
    setDraft({
      id: faq.id,
      question: faq.question,
      answerHtml: faq.answer,
      videoUrl: faq.videoUrl ?? "",
      answerType: faq.answerType,
      status: faq.status,
      isActive: faq.isActive,
    });
    setNotice(null);
  }

  // Populate the contentEditable when the editor opens.
  useEffect(() => {
    if (draft && editorRef.current) {
      editorRef.current.innerHTML = draft.answerHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDraft((prev) =>
        prev ? { ...prev, answerHtml: editorRef.current!.innerHTML } : prev,
      );
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const question = draft.question.trim();
    const needsText = draft.answerType !== "video";
    const needsVideo = draft.answerType !== "text";
    const textContent = stripHtml(draft.answerHtml);

    if (!question) {
      setNotice({ kind: "error", text: "The question is required." });
      return;
    }
    if (needsText && !textContent) {
      setNotice({ kind: "error", text: "A text answer is required for this answer type." });
      return;
    }
    if (needsVideo && !toVideoEmbed(draft.videoUrl)) {
      setNotice({
        kind: "error",
        text: "A supported video URL (YouTube / Vimeo / Google Drive / direct file) is required.",
      });
      return;
    }

    const saved: Faq = {
      id: draft.id ?? `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question,
      answer: sanitizeFaqHtml(draft.answerHtml),
      videoUrl: needsVideo ? toVideoEmbed(draft.videoUrl)!.embedUrl : null,
      answerType: draft.answerType,
      order: 0,
      status: draft.status,
      isActive: draft.isActive,
    };

    const list = faqs ?? [];
    const next = draft.id
      ? list.map((faq) => (faq.id === draft.id ? { ...saved, order: faq.order } : faq))
      : [...list, saved];

    setDraft(null);
    await persist(next);
  }

  function toggleActive(faq: Faq) {
    void persist(
      (faqs ?? []).map((item) =>
        item.id === faq.id ? { ...item, isActive: !item.isActive } : item,
      ),
    );
  }

  function togglePublish(faq: Faq) {
    void persist(
      (faqs ?? []).map((item) =>
        item.id === faq.id
          ? {
              ...item,
              status: item.status === "published" ? ("unpublished" as const) : ("published" as const),
            }
          : item,
      ),
    );
  }

  function removeFaq(id: string) {
    setDeleteTargetId(null);
    void persist((faqs ?? []).filter((faq) => faq.id !== id));
  }

  function moveItem(from: number, to: number) {
    const list = faqs ?? [];
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persist(next);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    moveItem(dragIndex, targetIndex);
    setDragIndex(null);
  }

  const visible = useMemo(() => {
    const list = faqs ?? [];
    const query = search.trim().toLowerCase();
    return list.filter((faq) => {
      if (
        query &&
        !`${faq.question} ${stripHtml(faq.answer)}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      switch (filter) {
        case "published":
          return faq.status === "published";
        case "unpublished":
          return faq.status === "unpublished";
        case "enabled":
          return faq.isActive;
        case "disabled":
          return !faq.isActive;
        default:
          return true;
      }
    });
  }, [faqs, search, filter]);

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

  const inputClass =
    "mt-1 w-full rounded-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-2.5 text-sm text-heading outline-none transition placeholder:text-neutral-600 focus:border-[#2f6bce]/60";
  const iconButtonClass =
    "flex h-8 items-center justify-center gap-1 rounded-lg border border-ink/15 px-2 text-[11px] font-semibold text-neutral-400 transition hover:border-[#93c5fd] hover:text-heading disabled:cursor-not-allowed disabled:opacity-30";

  const deleteTarget = faqs?.find((faq) => faq.id === deleteTargetId) ?? null;

  return (
    <main className="flex-1 bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Admin Panel — Content
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-heading">
              FAQ Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={startAdd}
            disabled={busy}
            className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add FAQ
          </button>
        </header>

        {!faqs ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load the current FAQs. Please refresh the page.
          </p>
        ) : (
          <>
            {/* Search + status filter */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search FAQs…"
                aria-label="Search FAQs"
                className={`${inputClass} mt-0 max-w-xs flex-1`}
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as StatusFilter)}
                aria-label="Filter by status"
                className={`${inputClass} mt-0 w-auto`}
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <span className="ml-auto text-xs font-semibold text-neutral-500">
                {visible.length} of {faqs.length} shown · drag rows to reorder
              </span>
            </div>

            {/* FAQ table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
              <div className="hidden grid-cols-[24px_1fr_110px_150px_70px_170px_190px] items-center gap-3 border-b border-ink/10 px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 lg:grid">
                <span />
                <span>Question</span>
                <span>Type</span>
                <span>Status</span>
                <span>Order</span>
                <span>Last Updated</span>
                <span className="text-right">Actions</span>
              </div>

              {visible.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-neutral-500">
                  {faqs.length === 0
                    ? "No FAQs yet. Press “+ Add FAQ” to create the first one."
                    : "No FAQs match your search or filter."}
                </p>
              ) : (
                <ul>
                  {visible.map((faq) => {
                    const globalIndex = faqs.indexOf(faq);
                    const live = faq.status === "published" && faq.isActive;
                    return (
                      <li
                        key={faq.id}
                        draggable
                        onDragStart={() => setDragIndex(globalIndex)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDrop(globalIndex)}
                        className={`grid grid-cols-1 items-center gap-3 border-b border-ink/5 px-4 py-4 transition last:border-b-0 lg:grid-cols-[24px_1fr_110px_150px_70px_170px_190px] ${
                          live ? "bg-white admin-dark:bg-[#112544]" : "bg-[#f1f5f9] admin-dark:bg-[#0a162e]/60 opacity-70"
                        } ${dragIndex === globalIndex ? "opacity-40" : ""}`}
                      >
                        <span
                          aria-hidden
                          className="hidden cursor-grab select-none text-center text-neutral-600 lg:block"
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>

                        <span className="min-w-0">
                          <span className="block break-words text-sm font-bold text-heading">
                            {faq.question}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {stripHtml(faq.answer) ||
                              (faq.videoUrl ? "Video answer" : "")}
                          </span>
                        </span>

                        <span className="w-fit rounded-lg border border-ink/10 bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-neutral-300">
                          {ANSWER_TYPE_LABELS[faq.answerType]}
                        </span>

                        <span className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              faq.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-yellow-500/10 text-yellow-400"
                            }`}
                          >
                            {faq.status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              faq.isActive
                                ? "bg-primary-600/10 text-primary-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {faq.isActive ? "Enabled" : "Disabled"}
                          </span>
                        </span>

                        <span className="flex items-center gap-1 text-xs font-semibold text-neutral-400">
                          <button
                            type="button"
                            onClick={() => moveItem(globalIndex, globalIndex - 1)}
                            disabled={globalIndex === 0 || busy}
                            aria-label={`Move ${faq.question} up`}
                            className={iconButtonClass}
                          >
                            ↑
                          </button>
                          {globalIndex + 1}
                          <button
                            type="button"
                            onClick={() => moveItem(globalIndex, globalIndex + 1)}
                            disabled={globalIndex === faqs.length - 1 || busy}
                            aria-label={`Move ${faq.question} down`}
                            className={iconButtonClass}
                          >
                            ↓
                          </button>
                        </span>

                        <span className="text-xs text-neutral-500">
                          {formatDate(faq.updatedAt ?? faq.createdAt)}
                        </span>

                        <span className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => startEdit(faq)}
                            disabled={busy}
                            aria-label={`Edit ${faq.question}`}
                            className={iconButtonClass}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewFaq(faq)}
                            aria-label={`Preview ${faq.question}`}
                            className={iconButtonClass}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(faq)}
                            disabled={busy}
                            aria-label={`${faq.isActive ? "Disable" : "Enable"} ${faq.question}`}
                            className={iconButtonClass}
                          >
                            {faq.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePublish(faq)}
                            disabled={busy}
                            aria-label={`${faq.status === "published" ? "Unpublish" : "Publish"} ${faq.question}`}
                            className={iconButtonClass}
                          >
                            {faq.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(faq.id)}
                            disabled={busy}
                            aria-label={`Delete ${faq.question}`}
                            className="flex h-8 items-center justify-center rounded-lg border border-ink/15 px-2 text-[11px] font-semibold text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
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
      </section>

      {/* ── Add / Edit drawer ─────────────────────────────────────────── */}
      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={draft.id ? "Edit FAQ" : "Add FAQ"}
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDraft(null);
          }}
        >
          <div className="mx-auto my-4 max-w-2xl rounded-2xl border border-[#dbeafe] bg-white shadow-sm shadow-[#0b1e3a]/5 admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-heading">
              {draft.id ? "Edit FAQ" : "Add FAQ"}
            </h2>

            <label className="mt-5 block">
              <span className="text-xs font-semibold text-neutral-500">Question</span>
              <input
                type="text"
                value={draft.question}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, question: event.target.value } : prev,
                  )
                }
                placeholder="e.g. MediSpark Website কীভাবে ব্যবহার করব?"
                autoFocus
                className={inputClass}
              />
            </label>

            {/* Answer type */}
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold text-neutral-500">
                Answer Type
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(ANSWER_TYPE_LABELS) as FaqAnswerType[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setDraft((prev) =>
                          prev ? { ...prev, answerType: type } : prev,
                        )
                      }
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                        draft.answerType === type
                          ? "border-primary-500 bg-primary-600/15 text-primary-400"
                          : "border-ink/15 text-neutral-400 hover:text-heading"
                      }`}
                    >
                      {ANSWER_TYPE_LABELS[type]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>

            {/* Rich-text answer */}
            {draft.answerType !== "video" && (
              <div className="mt-5">
                <span className="text-xs font-semibold text-neutral-500">
                  Text Answer
                </span>
                <div className="mt-2 flex flex-wrap gap-1 rounded-t-xl border border-ink/10 border-b-0 bg-[#f8fbff] admin-dark:bg-[#0f2547] p-2">
                  {(
                    [
                      ["bold", "B", "font-bold"],
                      ["italic", "I", "italic"],
                      ["underline", "U", "underline"],
                      ["formatBlock:h3", "H", "font-bold"],
                      ["insertUnorderedList", "• List", ""],
                      ["insertOrderedList", "1. List", ""],
                    ] as const
                  ).map(([command, label]) => (
                    <button
                      key={command}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault(); // keep editor selection
                        const [cmd, val] = command.split(":");
                        exec(cmd, val);
                      }}
                      className="rounded-lg border border-ink/10 px-2.5 py-1 text-xs font-semibold text-neutral-300 transition hover:border-[#93c5fd] hover:text-[#1a3a78]"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      const href = window.prompt("Link URL (https://…)");
                      if (href && /^https?:\/\//i.test(href)) {
                        exec("createLink", href);
                      }
                    }}
                    className="rounded-lg border border-ink/10 px-2.5 py-1 text-xs font-semibold text-neutral-300 transition hover:border-[#93c5fd] hover:text-[#1a3a78]"
                  >
                    Link
                  </button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="FAQ answer rich text editor"
                  onInput={() =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            answerHtml: editorRef.current?.innerHTML ?? "",
                          }
                        : prev,
                    )
                  }
                  className="prose-invert min-h-[120px] rounded-b-xl border border-ink/10 bg-[#f8fbff] admin-dark:bg-[#0f2547] px-3.5 py-3 text-sm leading-relaxed text-neutral-200 outline-none transition focus:border-[#2f6bce]/60 [&_a]:text-primary-400 [&_a]:underline [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
                />
              </div>
            )}

            {/* Video URL */}
            {draft.answerType !== "text" && (
              <label className="mt-5 block">
                <span className="text-xs font-semibold text-neutral-500">
                  Video URL
                </span>
                <input
                  type="url"
                  value={draft.videoUrl}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev ? { ...prev, videoUrl: event.target.value } : prev,
                    )
                  }
                  placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/… or a Shorts link"
                  className={inputClass}
                />
                <VideoUrlHint url={draft.videoUrl} />
                <p className="mt-1 text-[11px] text-neutral-600">
                  The website shows this inside a responsive 16:9 player — no code needed.
                </p>
              </label>
            )}

            {/* Publish + enable defaults for new items */}
            {!draft.id && (
              <div className="mt-5 flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                  <input
                    type="checkbox"
                    checked={draft.status === "published"}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: event.target.checked
                                ? ("published" as const)
                                : ("unpublished" as const),
                            }
                          : prev,
                      )
                    }
                    className="h-4 w-4 accent-primary-600"
                  />
                  Publish immediately
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, isActive: event.target.checked } : prev,
                      )
                    }
                    className="h-4 w-4 accent-primary-600"
                  />
                  Enabled
                </label>
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={busy}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={busy}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Saving…" : draft.id ? "Save Changes" : "Create FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview dialog (renders exactly like the website) ──────────── */}
      {previewFaq && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preview FAQ"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewFaq(null);
          }}
        >
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e] p-2 shadow-2xl">
            <div className="rounded-2xl border border-primary-600/50 bg-white admin-dark:bg-[#112544] shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-4 px-5 py-4 text-left">
                <span className="font-semibold text-heading">
                  {previewFaq.question}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 shrink-0 rotate-180 text-primary-500"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              <div className="px-5 pb-5">
                {previewFaq.answerType !== "video" && (
                  <div
                    className="text-sm leading-relaxed text-neutral-300 [&_a]:text-primary-400 [&_a]:underline [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeFaqHtml(previewFaq.answer),
                    }}
                  />
                )}
                {previewFaq.answerType !== "text" && (
                  <FaqVideoPlayer url={previewFaq.videoUrl ?? ""} />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewFaq(null)}
              className="mx-auto mt-3 block rounded-xl border border-ink/15 px-5 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-[#93c5fd] hover:text-heading"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this FAQ?"
        message={
          deleteTarget
            ? `"${deleteTarget.question}" will be permanently removed from the database and the website.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTargetId) removeFaq(deleteTargetId);
        }}
        onClose={() => setDeleteTargetId(null)}
      />
    </main>
  );
}
