"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  inputClass,
} from "./admin-ui";
import { parsePastedMcqs } from "@/lib/paste-mcq-parser";

type ExamBrief = {
  id: string;
  title: string;
  subject?: string;
  totalMarks?: number;
  durationMinutes?: number;
  questionCount?: number;
  totalQuestions?: number;
  ruleTemplate?: string | null;
  rule_template?: string | null;
  status?: string;
  marksPerQuestion?: number | null;
};

type ExamQuestion = {
  id: number | null;
  examId: string | null;
  subject: string;
  question: string;
  questionImage?: string | null;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  marks: number;
  isActive?: boolean;
};

const EMPTY_OPTIONS = ["", "", "", ""];

function isCompleted(q: ExamQuestion | null | undefined): boolean {
  if (!q || q.id === null) return false;
  const hasText = q.question && q.question.trim().length >= 3;
  const hasImage = !!q.questionImage;
  if (!hasText && !hasImage) return false;
  const filled = q.options.filter((o) => o && o.trim().length > 0);
  if (filled.length < 2) return false;
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) return false;
  if (!q.options[q.correctIndex]?.trim()) return false;
  return true;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isDraftCompleted(q: ExamQuestion): boolean {
  const hasText = q.question && q.question.trim().length >= 3;
  const hasImage = !!q.questionImage;
  if (!hasText && !hasImage) return false;
  const filled = q.options.filter((o) => o && o.trim().length > 0);
  if (filled.length < 2) return false;
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) return false;
  if (!q.options[q.correctIndex]?.trim()) return false;
  return true;
}

export default function ExamPaperEditor({
  exam,
  authHeaders,
  onClose,
  onChanged,
  embedded = false,
}: {
  exam: ExamBrief;
  authHeaders: Record<string, string>;
  onClose: () => void;
  onChanged?: () => void;
  embedded?: boolean;
}) {
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [imageUploadingSlot, setImageUploadingSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSavingRef = useRef(false);
  // Single data structure — one set of fixed slots, both detected and manual share it
  const [slots, setSlots] = useState<ExamQuestion[]>([]);

  const bearer = useMemo(() => authHeaders["Authorization"] || authHeaders["authorization"] || "", [authHeaders]);

  const totalSlots = useMemo(() => {
    const qCount = Number(exam.questionCount ?? exam.totalQuestions ?? 0);
    if (Number.isFinite(qCount) && qCount > 0) return Math.floor(qCount);
    if (questions) return questions.length;
    return 0;
  }, [exam.questionCount, exam.totalQuestions, questions]);

  const completedCount = useMemo(() => {
    return slots.filter(isDraftCompleted).length;
  }, [slots]);

  const progressText = totalSlots > 0 ? `${completedCount}/${totalSlots} Questions Completed` : `${completedCount} questions`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/exams/questions?examId=${encodeURIComponent(exam.id)}`, {
        cache: "no-store",
        headers: authHeaders,
      });
      const data = (await res.json()) as { questions?: ExamQuestion[] };
      setQuestions(data.questions ?? []);
    } catch {
      setQuestions([]);
    }
  }, [exam.id, authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  // Sync slots whenever questions or totalSlots change
  useEffect(() => {
    if (questions === null) return;
    const next: ExamQuestion[] = [];
    for (let i = 0; i < totalSlots; i += 1) {
      const q = i < questions.length ? questions[i] : null;
      if (q) {
        const opts = [...q.options];
        while (opts.length < 4) opts.push("");
        if (opts.length > 4) opts.length = 4;
        next.push({
          id: q.id,
          examId: q.examId,
          subject: q.subject || exam.subject || "",
          question: q.question || "",
          questionImage: q.questionImage || null,
          options: opts,
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation ?? null,
          marks: q.marks ?? (Number(exam.marksPerQuestion) || 1),
        });
      } else {
        next.push({
          id: null,
          examId: exam.id,
          subject: exam.subject || "",
          question: "",
          questionImage: null,
          options: [...EMPTY_OPTIONS],
          correctIndex: 0,
          explanation: null,
          marks: Number(exam.marksPerQuestion) || 1,
        });
      }
    }
    if (totalSlots === 0 && questions.length > 0) {
      // fallback when totalSlots not set
      const fallback = questions.map((q) => {
        const opts = [...q.options];
        while (opts.length < 4) opts.push("");
        if (opts.length > 4) opts.length = 4;
        return { ...q, options: opts, questionImage: (q as ExamQuestion).questionImage ?? null } as ExamQuestion;
      });
      setSlots(fallback);
    } else {
      setSlots(next);
    }
  }, [questions, totalSlots, exam.id, exam.subject, exam.marksPerQuestion]);

  // Bulk detection — parse and fill fixed slots sequentially (Q01 -> QNN)
  function handleDetect() {
    setError(null);
    setNotice(null);
    if (!pasteText.trim()) {
      setError("Paste your questions first.");
      return;
    }
    if (totalSlots <= 0) {
      setError("Exam Total Questions is not set.");
      return;
    }
    setPasteBusy(true);
    try {
      const parsed = parsePastedMcqs(pasteText);
      if (parsed.length === 0) {
        setError("No MCQs detected.");
        return;
      }
      const toFill = parsed.slice(0, totalSlots);
      setSlots((prev) => {
        const next = [...prev];
        for (let i = 0; i < toFill.length; i++) {
          const p = toFill[i];
          const existing = next[i];
          next[i] = {
            ...existing,
            subject: exam.subject || existing.subject || "",
            question: p.question || existing.question,
            options: p.options.map((o) => o || "") as string[],
            correctIndex: p.correctIndex ?? existing.correctIndex ?? 0,
            // keep existing image/marks/id
          };
        }
        return next;
      });
      const extra = parsed.length - totalSlots;
      let msg = `Detected ${parsed.length} question(s) — mapped Q01–Q${pad(Math.min(parsed.length, totalSlots))}. Edit directly and save.`;
      if (extra > 0) msg += ` ${extra} extra not mapped (limit ${totalSlots}).`;
      if (parsed.length < totalSlots) msg += ` ${totalSlots - parsed.length} slot(s) still blank — click to type.`;
      setNotice(msg);
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse.");
    } finally {
      setPasteBusy(false);
    }
  }

  async function saveAll() {
    // Prevent duplicate rapid taps — ref guard handles sync double-click before state updates
    if (isSavingRef.current || savingAll || busy) return;
    setError(null);
    setNotice(null);
    if (slots.length === 0) {
      setError("No questions to save.");
      return;
    }

    // Immediate validation + dirty detection — only save changed questions
    const dirtyPayload: Record<string, unknown>[] = [];
    let hasAnyContent = false;
    for (let idx = 0; idx < slots.length; idx++) {
      const s = slots[idx];
      const original = questions?.[idx] ?? null;
      const hasText = s.question.trim().length >= 3;
      const hasImage = !!s.questionImage;
      const hasContent = hasText || hasImage;
      const hasAnyOption = s.options.some((o) => o.trim().length > 0);
      const isEmptySlot = !hasContent && !hasAnyOption;
      if (isEmptySlot) {
        // Empty and no original, or empty but original was also empty (placeholder) — skip, do not delete untouched others
        continue;
      }
      hasAnyContent = true;
      // Validate this non-empty slot immediately
      if (!hasContent) {
        setError(`Q${pad(idx + 1)}: Add question text or image (image can be the full question).`);
        return;
      }
      const nonEmpty = s.options.filter((o) => o.trim().length > 0);
      if (nonEmpty.length < 2) {
        setError(`Q${pad(idx + 1)}: At least two non-empty options are required.`);
        return;
      }
      if (s.correctIndex < 0 || s.correctIndex >= s.options.length || !s.options[s.correctIndex]?.trim()) {
        setError(`Q${pad(idx + 1)}: Select a valid correct answer.`);
        return;
      }

      // Dirty check — skip if identical to persisted version
      let isDirty = false;
      if (!original || original.id === null) {
        // New question with content -> dirty
        isDirty = true;
      } else {
        const origImage = original.questionImage ?? null;
        const curImage = s.questionImage ?? null;
        if ((original.question ?? "").trim() !== s.question.trim()) isDirty = true;
        else if (origImage !== curImage) isDirty = true;
        else if (original.correctIndex !== s.correctIndex) isDirty = true;
        else if ((original.subject ?? "") !== (s.subject ?? "")) isDirty = true;
        else if (Number(original.marks) !== Number(s.marks)) isDirty = true;
        else {
          for (let oi = 0; oi < 4; oi++) {
            if ((original.options[oi] ?? "") !== (s.options[oi] ?? "")) {
              isDirty = true;
              break;
            }
          }
        }
      }
      if (!isDirty) continue;

      dirtyPayload.push({
        ...(original && original.id !== null ? { id: original.id } : {}),
        examId: exam.id,
        subject: s.subject || exam.subject || "",
        question: s.question.trim(),
        questionImage: s.questionImage || null,
        question_image: s.questionImage || null,
        options: s.options,
        correctIndex: s.correctIndex,
        explanation: s.explanation || null,
        marks: Number(s.marks) || Number(exam.marksPerQuestion) || 1,
        isActive: true,
        order: idx + 1,
      });
    }
    if (!hasAnyContent) {
      setError("No question content to save — add text or image to at least one question.");
      return;
    }
    if (dirtyPayload.length === 0) {
      setNotice("✓ Saved — no changes to update.");
      setTimeout(() => setNotice(null), 2500);
      return;
    }
    if (imageUploadingSlot !== null) {
      setError("Please wait — image is still uploading. Save will be available once the upload finishes.");
      return;
    }

    // Guard duplicate taps only for the async section
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSavingAll(true);
    setBusy(true);
    setNotice("Saving...");
    try {
      const res = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ examId: exam.id, questions: dirtyPayload }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; questions?: ExamQuestion[] } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to save. Please try again.");
        setNotice(null);
        return;
      }
      // Persist confirmed — update local state without full editor reload
      if (data?.questions && Array.isArray(data.questions)) {
        // Sync questions directly; slots will be reconciled via effect but we patch ids immediately to keep stability
        setQuestions(data.questions);
        // Optimistically patch slots ids for newly created questions to keep stable until effect syncs
        setSlots((prev) =>
          prev.map((slot, idx) => {
            const orig = questions?.[idx] ?? null;
            // Find matching fresh question by order (sort_order)
            const fresh = data.questions![idx] ?? null;
            if (fresh && fresh.id !== null) {
              return { ...slot, id: fresh.id, examId: fresh.examId };
            }
            // If we inserted a new row, fresh may be at idx; keep slot id if still null and fresh exists
            return slot;
          }),
        );
      } else {
        // Fallback — minimal refresh of questions only, not full page
        // Keep it as silent background sync without flashing editor
        try {
          const r = await fetch(`/api/admin/exams/questions?examId=${encodeURIComponent(exam.id)}`, {
            cache: "no-store",
            headers: authHeaders,
          });
          const d = (await r.json()) as { questions?: ExamQuestion[] };
          if (r.ok) setQuestions(d.questions ?? []);
        } catch {
          // ignore — data is already persisted, UI shows Saved
        }
      }
      onChanged?.();
      setNotice("✓ Saved");
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setError("Failed to save. Please try again.");
      setNotice(null);
    } finally {
      isSavingRef.current = false;
      setBusy(false);
      setSavingAll(false);
    }
  }

  async function handleImageUpload(file: File, slotIndex: number) {
    if (!bearer) {
      setError("Not authorized — sign in as admin.");
      return;
    }
    setImageUploadingSlot(slotIndex);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dir", "exams");
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: bearer as string },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setSlots((prev) => prev.map((s, i) => (i === slotIndex ? { ...s, questionImage: data.url! } : s)));
      setNotice("Image attached — click Save to persist all questions.");
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setImageUploadingSlot(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        const slotAttr = e.target.getAttribute("data-slot");
        const slotIndex = slotAttr ? Number(slotAttr) : -1;
        if (file && slotIndex >= 0) void handleImageUpload(file, slotIndex);
      }}
    />
  );

  const headerBlock = (
    <div className={embedded ? "rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] sm:p-5" : "shrink-0 border-b border-[#dbeafe] bg-white shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]"}>
      <div className={embedded ? "flex flex-col gap-3" : "mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5"}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-lg font-extrabold leading-tight text-[#0b1e3a] admin-dark:text-white sm:text-xl">{exam.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" disabled={busy || savingAll || imageUploadingSlot !== null} onClick={() => void load()} className={buttonSecondaryClass}>↻ Refresh</button>
            <button type="button" disabled={busy || savingAll || imageUploadingSlot !== null} onClick={() => void saveAll()} className={buttonPrimaryClass}>{savingAll ? "Saving…" : imageUploadingSlot !== null ? "Uploading…" : "💾 Save"}</button>
          </div>
        </div>
        {totalSlots > 0 && (
          <div className="flex items-center gap-3">
            <p className={`text-xs font-extrabold ${completedCount >= totalSlots && totalSlots > 0 ? "text-emerald-600" : "text-slate-600 admin-dark:text-slate-300"}`}>{progressText}</p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 admin-dark:bg-[#1e3a65]">
              <div className={`h-full rounded-full transition-all ${completedCount >= totalSlots && totalSlots > 0 ? "bg-emerald-500" : "bg-[#2f6bce]"}`} style={{ width: totalSlots ? `${Math.round((completedCount / totalSlots) * 100)}%` : "0%" }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{completedCount}/{totalSlots}</span>
          </div>
        )}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 admin-dark:border-red-900/40 admin-dark:bg-red-500/10 admin-dark:text-red-300">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 admin-dark:border-emerald-900/30 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-300">{notice}</p>}
      </div>
    </div>
  );

  const innerPaper = (
    <div className={embedded ? "mt-4" : "flex-1 overflow-y-auto"}>
      <div className={embedded ? "" : "mx-auto max-w-4xl px-3 py-6 sm:px-6"}>
        {questions === null ? (
          <p className={`${cardClass} p-6 text-center text-sm text-slate-500`}>Loading paper…</p>
        ) : totalSlots === 0 ? (
          <div className={`${cardClass} p-6 text-center`}>
            <p className="text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">No slots configured.</p>
            <p className="mt-1 text-xs text-slate-500">Set Total Questions on the exam to generate Q01..QNN slots.</p>
          </div>
        ) : (
          <>
            {/* 1. Bulk Text Detection — only this at the top */}
            <div className={`${cardClass} mb-6 p-4 sm:p-5`}>
              <label htmlFor="paste-mcq-textarea" className="mb-2 block text-sm font-bold text-[#0b1e3a] admin-dark:text-zinc-100">Paste your questions</label>
              <textarea
                id="paste-mcq-textarea"
                rows={10}
                className={`${inputClass} min-h-[180px] font-mono text-sm leading-relaxed`}
                placeholder="Paste your questions"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="mt-3">
                <button type="button" disabled={pasteBusy || !pasteText.trim()} onClick={handleDetect} className={`${buttonPrimaryClass} disabled:opacity-40`}>
                  {pasteBusy ? "Detecting..." : "Detect Questions"}
                </button>
              </div>
            </div>

            {/* 2. Fixed slots — always Q01..QNN, blank ready for direct editing, no empty states */}
            <ol className="space-y-4">
              {slots.map((slot, index) => (
                <li key={`slot-${index}-${slot.id ?? "new"}`} className="rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#0b1e3a] px-2 text-xs font-extrabold text-white admin-dark:bg-[#1e3a65]">Q{pad(index + 1)}</span>
                    {isDraftCompleted(slot) && <span className="ml-auto text-[11px] font-bold text-emerald-600">✓ Completed</span>}
                  </div>

                  {/* Question content editor — supports text, image, or text+image directly */}
                  <div className="relative">
                    <textarea
                      rows={2}
                      className={`${inputClass} min-h-[72px] pr-12 font-medium`}
                      value={slot.question}
                      onChange={(e) => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, question: e.target.value } : s)))}
                      placeholder="Question — text, image, or text + image (e.g. Which organelle is powerhouse? or attach image as question)"
                    />
                    <button
                      type="button"
                      disabled={imageUploadingSlot === index}
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute("data-slot", String(index));
                          fileInputRef.current.click();
                        }
                      }}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbeafe] bg-white text-slate-500 shadow-sm hover:border-[#93c5fd] hover:bg-[#f8fbff] hover:text-[#1a3a78] disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300 admin-dark:hover:bg-[#1e3a65]"
                      title="Attach image to question (image will be part of question content)"
                      aria-label={`Attach image to Q${pad(index + 1)}`}
                    >
                      {imageUploadingSlot === index ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#1a3a78]" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 16l4.5-4.5a1 1 0 011.4 0L14 15.5M14 14l2-2a1 1 0 011.4 0L20 14.5M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                  </div>
                  {/* Integrated image preview — part of question content, not a separate section below */}
                  {slot.questionImage && (
                    <div className="mt-3 relative overflow-hidden rounded-xl border border-[#dbeafe] bg-[#f8fbff] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slot.questionImage} alt={`Q${pad(index + 1)} question image`} className="max-h-56 w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, questionImage: null } : s)))}
                        className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-black/85"
                        aria-label={`Remove image from Q${pad(index + 1)}`}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}

                  {/* Options — directly editable, circle selector for correct answer */}
                  <div className="mt-3 space-y-2">
                    {([0, 1, 2, 3] as const).map((oi) => {
                      const isCorrect = slot.correctIndex === oi;
                      return (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, correctIndex: oi } : s)))}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition ${isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400 hover:border-slate-400 admin-dark:border-zinc-600 admin-dark:bg-[#0f2547]"}`}
                            title="Select correct answer"
                            aria-label={`Mark option ${String.fromCharCode(65 + oi)} as correct for Q${pad(index + 1)}`}
                          >
                            {isCorrect ? "●" : "○"}
                          </button>
                          <span className="w-6 shrink-0 text-xs font-extrabold text-slate-500">{String.fromCharCode(65 + oi)}.</span>
                          <input
                            className={inputClass}
                            value={slot.options[oi] ?? ""}
                            onChange={(e) => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, options: s.options.map((v, j) => (j === oi ? e.target.value : v)) } : s)))}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          />
                        </div>
                      );
                    })}
                  </div>

                </li>
              ))}
            </ol>

          </>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {hiddenFileInput}
        {headerBlock}
        {innerPaper}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f1f5f9] admin-dark:bg-[#0b1628]" role="dialog" aria-modal="true">
      {hiddenFileInput}
      {headerBlock}
      {innerPaper}
    </div>
  );
}
