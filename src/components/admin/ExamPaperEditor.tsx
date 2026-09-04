"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
} from "./admin-ui";

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
  if (!q.question || q.question.trim().length < 3) return false;
  const filled = q.options.filter((o) => o && o.trim().length > 0);
  if (filled.length < 2) return false;
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) return false;
  if (!q.options[q.correctIndex]?.trim()) return false;
  return true;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ── MCQ bulk parser ────────────────────────────────────────────────────

function cleanOptionText(raw: string): string {
  let s = raw.trim();
  // Remove leading * / ► markers
  s = s.replace(/^\*\s*/, "").trim();
  s = s.replace(/^[\*\-•]+\s*/, "").trim();
  // Remove trailing ✓ / * / (correct)
  s = s.replace(/\s*✓\s*$/, "").trim();
  s = s.replace(/\s*\(correct\)\s*$/i, "").trim();
  s = s.replace(/\s*\*\s*$/, "").trim();
  return s;
}

function parseMCQs(input: string): Array<{ question: string; options: string[]; correctIndex: number }> {
  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  // Split into blocks at each question start (numbered or Qnn)
  const blocks = text.split(/(?=\n\s*(?:\d{1,3}\s*[\.\)]\s+|Q\s*0*\d+\s*[\.\)\:\-]?\s+))/);
  // Single block case: if no newline delimiter but contains multiple " 2. " inline, fallback to regex match positions
  let effectiveBlocks = blocks;
  if (blocks.length === 1 && text.length > 200) {
    // Try to find all question starts globally
    const re = /(?:^|\n)\s*(?:Q\s*0*\d+\s*[\.\)\:\-]?\s+|\d{1,3}\s*[\.\)]\s+)/g;
    const indices: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const at = m.index + (m[0].startsWith("\n") ? 1 : 0) + m[0].length - m[0].trimStart().length - (m[0].match(/^\s*(?:Q\s*0*\d+|\d{1,3})/)?.[0].length ?? 0);
      // Use m.index as block start (keep delimiter)
      indices.push(m.index);
    }
    // dedup sort
    const uniq = [...new Set(indices)].sort((a, b) => a - b);
    if (uniq.length > 1) {
      effectiveBlocks = [];
      for (let i = 0; i < uniq.length; i++) {
        const start = uniq[i];
        const end = uniq[i + 1] ?? text.length;
        effectiveBlocks.push(text.slice(start, end));
      }
    }
  }

  const results: Array<{ question: string; options: string[]; correctIndex: number }> = [];

  for (const rawBlock of effectiveBlocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    // Strip leading question number
    const stripped = block.replace(/^\s*(?:Q\s*0*\d+\s*[\.\)\:\-]?\s*|\d{1,3}\s*[\.\)]\s*)/i, "").trim();
    if (!stripped) continue;

    const lines = stripped.split("\n").map((l) => l.trimEnd());

    // Find first option line
    const optionRe = /^\s*([A-D])\s*[\.\)\:\-\)]\s*(.+)$/i;
    const answerRe = /^\s*(?:Ans(?:wer)?|Correct(?:\s*Ans(?:wer)?)?)\s*[\:\-\=]?\s*([A-D])\b/i;

    let firstOptionIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (optionRe.test(lines[i])) {
        firstOptionIdx = i;
        break;
      }
    }

    let questionText = "";
    let options: string[] = ["", "", "", ""];
    let correctIndex = 0;
    let answerFound = false;

    if (firstOptionIdx === -1) {
      // Try global inline options parse (e.g. "A. foo B. bar C. baz D. qux")
      const globalOptRe = /\b([A-D])\s*[\.\)\:\-]\s*([^A-D]+?)(?=\s+[A-D]\s*[\.\)\:\-]|\s*(?:Ans|Answer|Correct)\s*[\:\-\=]|\s*$)/gi;
      const opts: string[] = ["", "", "", ""];
      let gm: RegExpExecArray | null;
      let found = false;
      const inlineText = stripped;
      while ((gm = globalOptRe.exec(inlineText)) !== null) {
        const letter = gm[1].toUpperCase();
        const idx = letter.charCodeAt(0) - 65;
        if (idx >= 0 && idx < 4) {
          let raw = gm[2].trim();
          // Check for * marker before this option (look ahead/behind)
          const before = inlineText.slice(Math.max(0, gm.index - 2), gm.index);
          if (before.includes("*")) answerFound = true;
          raw = cleanOptionText(raw);
          // Detect trailing * before next option
          if (raw.endsWith("*")) {
            raw = cleanOptionText(raw.slice(0, -1));
            correctIndex = idx;
            answerFound = true;
          }
          // Detect leading * in original match
          if (gm[0].trim().startsWith("*")) {
            correctIndex = idx;
            answerFound = true;
          }
          opts[idx] = raw;
          found = true;
        }
      }
      if (found) {
        const beforeOpts = inlineText.split(/\bA\s*[\.\)\:\-]/i)[0];
        questionText = beforeOpts.replace(/^\s*(?:Q\s*0*\d+.*?\n|\d+\s*[\.\)]\s*)/, "").trim();
        // Answer line at end
        const ansMatch = inlineText.match(answerRe);
        if (ansMatch) {
          correctIndex = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
          answerFound = true;
        }
        options = opts;
        // Clean up questionText if it still contains options fragment
        questionText = questionText.split(/\bA\s*[\.\)\:\-]/i)[0].trim();
      } else {
        continue;
      }
    } else {
      // Question is lines before first option (joined)
      const qLines = lines.slice(0, firstOptionIdx).filter((l) => l.trim().length > 0);
      questionText = qLines.join(" ").trim();

      // Parse options from firstOptionIdx onward until answer or non-option text block
      for (let i = firstOptionIdx; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;
        const ansM = trimmed.match(answerRe);
        if (ansM) {
          const idx = ansM[1].toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < 4) {
            correctIndex = idx;
            answerFound = true;
          }
          continue;
        }
        const optM = trimmed.match(optionRe);
        if (optM) {
          const letter = optM[1].toUpperCase();
          const idx = letter.charCodeAt(0) - 65;
          if (idx >= 0 && idx < 4) {
            let raw = optM[2].trim();
            // Detect * marker at start of original line
            const startsWithStar = /^\s*\*/.test(line) || raw.startsWith("*");
            if (startsWithStar) {
              correctIndex = idx;
              answerFound = true;
              raw = raw.replace(/^\*\s*/, "");
            }
            // Detect (correct) or ✓ at end
            if (/\b(correct)\b/i.test(raw) || raw.endsWith("✓") || raw.endsWith("*")) {
              correctIndex = idx;
              answerFound = true;
            }
            options[idx] = cleanOptionText(raw);
          }
        } else {
          // Continuation of previous option or stray line — if we already have options, append to last non-empty option
          if (trimmed.length > 0 && options.some((o) => o)) {
            // Find last filled option index
            let last = -1;
            for (let k = 3; k >= 0; k--) if (options[k]) { last = k; break; }
            if (last >= 0 && !answerRe.test(trimmed) && !optionRe.test(trimmed)) {
              // Treat as continuation only if not answer line
              // Avoid appending answer-explanation lines
              if (trimmed.length < 120) options[last] = `${options[last]} ${cleanOptionText(trimmed)}`.trim();
            }
          }
        }
      }
    }

    questionText = questionText.replace(/\s+/g, " ").trim();
    options = options.map((o) => o.replace(/\s+/g, " ").trim());

    const filled = options.filter((o) => o.length > 0);
    if (questionText.length < 2) continue;
    if (filled.length < 2) continue;

    // If answer not found, keep 0 (will be editable)
    if (!answerFound) correctIndex = 0;
    if (correctIndex < 0 || correctIndex > 3) correctIndex = 0;
    // Ensure correct option not empty — if it is, fallback to first non-empty
    if (!options[correctIndex]) {
      const firstNonEmpty = options.findIndex((o) => o);
      if (firstNonEmpty >= 0) correctIndex = firstNonEmpty;
    }

    results.push({ question: questionText, options, correctIndex });
  }

  return results;
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
  const [detectBusy, setDetectBusy] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [imageUploadingSlot, setImageUploadingSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bearer = useMemo(() => authHeaders["Authorization"] || authHeaders["authorization"] || "", [authHeaders]);

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

  const totalSlots = useMemo(() => {
    const qCount = Number(exam.questionCount ?? exam.totalQuestions ?? 0);
    if (Number.isFinite(qCount) && qCount > 0) return Math.floor(qCount);
    if (questions) return questions.length;
    return 0;
  }, [exam.questionCount, exam.totalQuestions, questions]);

  const completedCount = useMemo(() => {
    if (!questions) return 0;
    return questions.filter(isCompleted).length;
  }, [questions]);

  const displaySlots = useMemo(() => {
    if (!questions) return [];
    const list: Array<{ index: number; q: ExamQuestion | null }> = [];
    for (let i = 0; i < totalSlots; i += 1) {
      const q = i < questions.length ? questions[i] : null;
      list.push({ index: i, q });
    }
    if (totalSlots === 0) {
      return questions.map((q, i) => ({ index: i, q }));
    }
    return list;
  }, [questions, totalSlots]);

  const progressText =
    totalSlots > 0
      ? `${completedCount}/${totalSlots} Questions Completed`
      : `${completedCount} questions`;

  // Local draft for inline editing — mirrors DB but allows immediate typing before save
  const [drafts, setDrafts] = useState<Record<number, { question: string; options: string[]; correctIndex: number }>>({});

  useEffect(() => {
    // Sync drafts when questions load (keep user edits if already drafting)
    if (!questions) return;
    const next: Record<number, { question: string; options: string[]; correctIndex: number }> = {};
    for (let i = 0; i < totalSlots; i++) {
      const q = i < questions.length ? questions[i] : null;
      if (q && q.id !== null) {
        // Preserve existing draft if user is mid-edit (has unsaved changes) — only fill if missing
        if (drafts[i]) {
          next[i] = drafts[i];
        } else {
          const opts = q.options.length >= 4 ? q.options.slice(0, 4) : [...q.options, ...EMPTY_OPTIONS.slice(q.options.length)];
          while (opts.length < 4) opts.push("");
          next[i] = { question: q.question || "", options: opts.slice(0, 4), correctIndex: q.correctIndex ?? 0 };
        }
      } else {
        if (drafts[i]) {
          next[i] = drafts[i];
        } else {
          next[i] = { question: q?.question || "", options: q?.options?.slice(0, 4) ?? [...EMPTY_OPTIONS], correctIndex: q?.correctIndex ?? 0 };
          while (next[i].options.length < 4) next[i].options.push("");
          next[i].options = next[i].options.slice(0, 4);
        }
      }
    }
    // Only update if drafts empty or totalSlots changed; avoid overwriting active edits on every load
    // We merge: keep existing drafts for slots that already have draft
    setDrafts((prev) => {
      const merged: Record<number, { question: string; options: string[]; correctIndex: number }> = { ...prev };
      for (let i = 0; i < totalSlots; i++) {
        if (!merged[i]) merged[i] = next[i];
      }
      // Remove extra indices beyond totalSlots
      Object.keys(merged).forEach((k) => {
        if (Number(k) >= totalSlots) delete merged[Number(k)];
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, totalSlots]);

  async function persistSlot(slotIndex: number) {
    const draft = drafts[slotIndex];
    if (!draft) return;
    const slot = displaySlots[slotIndex];
    const existing = slot?.q;

    const qText = draft.question.trim();
    const opts = draft.options.map((o) => o.trim());

    // Allow saving incomplete slots as draft — but require at least question or any option to avoid blank saves
    // For blank slots the admin can just type and we save on blur; skip if completely empty
    const anyOption = opts.some((o) => o.length > 0);
    if (!qText && !anyOption) return;
    // Enforce minimal validation only when both present; let backend handle full validation
    // We save even if only question typed (will be incomplete but stored)

    // Prepare options padded to 4
    const saveOptions = [...opts];
    while (saveOptions.length < 4) saveOptions.push("");
    const finalOptions = saveOptions.slice(0, 4);

    // Ensure correctIndex points to non-empty option if possible
    let ci = draft.correctIndex;
    if (ci < 0 || ci >= 4) ci = 0;
    // Don't auto-correct here — allow saving even if correct points to empty (backend will reject)
    // But we keep as is

    setSavingSlot(slotIndex);
    setError(null);
    try {
      const order = slotIndex + 1;
      const marksPerQ = Number((exam.marksPerQuestion ?? 1) as number) || 1;
      const body: Record<string, unknown> = {
        ...(existing && existing.id !== null ? { id: existing.id } : {}),
        examId: exam.id,
        subject: existing?.subject || exam.subject || "",
        question: qText || " ",
        questionImage: existing?.questionImage || null,
        question_image: existing?.questionImage || null,
        options: finalOptions,
        correctIndex: ci,
        explanation: existing?.explanation || null,
        marks: (existing?.marks ?? marksPerQ) as number,
        isActive: true,
        order,
      };
      // If question is blank placeholder, use " " to pass server min length; but we already early-returned if empty
      if (!qText) body.question = finalOptions.find((o) => o) ? `Question ${pad(slotIndex + 1)}` : qText;
      // If still empty, skip save
      if (!String(body.question).trim() || String(body.question).trim().length < 1) return;
      // Server requires >=3 chars and 2 options; if not met, still try but handle error quietly
      const res = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        // Only surface error if slot has meaningful content
        if (qText.length >= 2 || anyOption) setError(data?.error ?? "Failed to save.");
        return;
      }
      await load();
      onChanged?.();
    } finally {
      setSavingSlot(null);
    }
  }

  async function handleDetect() {
    setError(null);
    setNotice(null);
    if (!bulkText.trim()) {
      setError("Paste your questions first.");
      return;
    }
    const parsed = parseMCQs(bulkText);
    if (parsed.length === 0) {
      setError("No questions detected. Check the format (numbered questions with A–D options).");
      return;
    }
    if (totalSlots === 0) {
      setError("Set Total Questions on the exam first.");
      return;
    }
    setDetectBusy(true);
    try {
      const count = Math.min(parsed.length, totalSlots);
      // Update drafts locally first for instant fill
      setDrafts((prev) => {
        const next = { ...prev };
        for (let i = 0; i < count; i++) {
          next[i] = {
            question: parsed[i].question,
            options: parsed[i].options.slice(0, 4),
            correctIndex: parsed[i].correctIndex,
          };
        }
        return next;
      });

      // Persist sequentially to preserve order
      for (let i = 0; i < count; i++) {
        const draft = { question: parsed[i].question, options: parsed[i].options.slice(0, 4), correctIndex: parsed[i].correctIndex };
        // eslint-disable-next-line no-await-in-loop
        await persistSlotWithData(i, draft);
      }
      await load();
      onChanged?.();
      setNotice(`Detected ${count} question${count === 1 ? "" : "s"} and filled Q01–Q${pad(count)}.`);
      setTimeout(() => setNotice(null), 3000);
      // Clear bulk area after success
      // Keep text for reference but not required
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed.");
    } finally {
      setDetectBusy(false);
    }
  }

  async function persistSlotWithData(slotIndex: number, draft: { question: string; options: string[]; correctIndex: number }) {
    const slot = displaySlots[slotIndex];
    const existing = slot?.q;
    const order = slotIndex + 1;
    const marksPerQ = Number((exam.marksPerQuestion ?? 1) as number) || 1;
    const finalOptions = [...draft.options];
    while (finalOptions.length < 4) finalOptions.push("");
    const body: Record<string, unknown> = {
      ...(existing && existing.id !== null ? { id: existing.id } : {}),
      examId: exam.id,
      subject: existing?.subject || exam.subject || "",
      question: draft.question.trim(),
      questionImage: existing?.questionImage || null,
      question_image: existing?.questionImage || null,
      options: finalOptions.slice(0, 4),
      correctIndex: draft.correctIndex,
      explanation: existing?.explanation || null,
      marks: (existing?.marks ?? marksPerQ) as number,
      isActive: true,
      order,
    };
    const res = await fetch("/api/admin/exams/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "Failed to save detected question.");
  }

  async function handleCorrectChange(slotIndex: number, newIdx: number) {
    setDrafts((prev) => ({ ...prev, [slotIndex]: { ...prev[slotIndex], correctIndex: newIdx } }));
    // Persist immediately
    const draft = drafts[slotIndex];
    if (!draft) return;
    const updated = { ...draft, correctIndex: newIdx };
    setDrafts((prev) => ({ ...prev, [slotIndex]: updated }));
    // slight delay to ensure state, then persist
    setTimeout(() => {
      setDrafts((curr) => {
        const cur = curr[slotIndex];
        if (cur) void persistSlotWithData(slotIndex, cur).then(() => {
          void load();
          onChanged?.();
        }).catch(() => setError("Failed to update correct answer."));
        return curr;
      });
    }, 0);
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
      // Save image to question
      const slot = displaySlots[slotIndex];
      const q = slot?.q;
      const draft = drafts[slotIndex];
      // Use existing or draft data
      const body: Record<string, unknown> = {
        ...(q && q.id !== null ? { id: q.id } : {}),
        examId: exam.id,
        subject: q?.subject || exam.subject || "",
        question: draft?.question?.trim() || q?.question || `Question ${pad(slotIndex + 1)}`,
        questionImage: data.url,
        question_image: data.url,
        options: draft ? draft.options.map((o) => o.trim()).slice(0, 4) : q?.options ?? [...EMPTY_OPTIONS],
        correctIndex: draft?.correctIndex ?? q?.correctIndex ?? 0,
        explanation: q?.explanation || null,
        marks: (q?.marks ?? Number(exam.marksPerQuestion ?? 1) ?? 1) || 1,
        isActive: true,
        order: slotIndex + 1,
      };
      // Ensure options valid
      while ((body.options as string[]).length < 4) (body.options as string[]).push("");
      if (!(body.options as string[]).some((o) => String(o).trim())) {
        (body.options as string[]) = [...EMPTY_OPTIONS];
      }
      // If question still empty, provide placeholder to allow image-only save
      if (!String(body.question).trim()) body.question = `Question ${pad(slotIndex + 1)}`;
      // Server requires at least 3 chars and 2 options — if slot is empty we still save with placeholder options
      // Fill placeholder options if empty
      const opts = body.options as string[];
      if (opts.filter((o) => String(o).trim()).length < 2) {
        // Keep empty will fail; show error instead of saving
        setError("Add question text and at least two options before attaching an image.");
        return;
      }
      const saveRes = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const saveData = (await saveRes.json().catch(() => null)) as { error?: string } | null;
      if (!saveRes.ok) throw new Error(saveData?.error || "Failed to save image.");
      await load();
      onChanged?.();
      setNotice("Image uploaded.");
      setTimeout(() => setNotice(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setImageUploadingSlot(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const headerBlock = (
    <div className={embedded ? "rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] sm:p-5" : "shrink-0 border-b border-[#dbeafe] bg-white shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]"}>
      <div className={embedded ? "flex flex-col gap-3" : "mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5"}>
        {!embedded && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold leading-tight text-[#0b1e3a] admin-dark:text-white sm:text-xl">{exam.title}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 admin-dark:text-slate-400">Question Management</p>
            </div>
            <button type="button" onClick={onClose} className={buttonSecondaryClass} aria-label="Close">Close</button>
          </div>
        )}

        {/* Paste area — at the very top, only this */}
        <div className="space-y-2">
          <p className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">Paste your questions</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste your questions"
            rows={6}
            className="min-h-[140px] w-full resize-y rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-3.5 text-sm leading-relaxed text-[#0b1e3a] placeholder:text-slate-400 focus:border-[#93c5fd] focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100 admin-dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            disabled={detectBusy || busy}
            onClick={() => void handleDetect()}
            className={`${buttonPrimaryClass} w-full sm:w-auto`}
          >
            {detectBusy ? "Detecting…" : "Detect Questions"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#eef4ff] pt-3 admin-dark:border-[#1e3a65]/60">
          <p className="text-xs font-extrabold text-slate-600 admin-dark:text-slate-300">{progressText}</p>
          <button type="button" disabled={busy} onClick={() => void load()} className={buttonSecondaryClass} title="Refresh">↻ Refresh</button>
        </div>

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
          <ol className="space-y-4">
            {displaySlots.map(({ index, q }) => {
              const slotNumber = index + 1;
              const draft = drafts[index] ?? { question: q?.question || "", options: (q?.options?.slice(0, 4) ?? [...EMPTY_OPTIONS]), correctIndex: (q?.correctIndex ?? 0) };
              // Ensure 4 options
              const opts = [...draft.options];
              while (opts.length < 4) opts.push("");
              const isSaving = savingSlot === index;

              return (
                <li
                  key={q?.id ?? `slot-${index}`}
                  className="rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] sm:p-5"
                >
                  <p className="text-xs font-extrabold tracking-widest text-[#0b1e3a] admin-dark:text-zinc-100">Q{pad(slotNumber)}</p>

                  {/* Question text — click to edit */}
                  <div className="mt-2">
                    <textarea
                      value={draft.question}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [index]: { ...draft, question: e.target.value, options: opts.slice(0, 4) } }))}
                      onBlur={() => void persistSlot(index)}
                      placeholder=""
                      rows={2}
                      className="min-h-[48px] w-full resize-y rounded-xl border border-transparent bg-[#f8fbff] p-3 text-sm font-semibold leading-relaxed text-[#0b1e3a] placeholder:text-slate-400 hover:border-[#dbeafe] focus:border-[#93c5fd] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#bfdbfe] admin-dark:bg-[#0f2547] admin-dark:text-zinc-100 admin-dark:placeholder:text-slate-500 admin-dark:focus:bg-[#0f2547]"
                    />
                    {q?.questionImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={q.questionImage} alt="Question image" className="mt-3 max-h-48 w-auto rounded-xl border border-neutral-200 object-contain admin-dark:border-zinc-700" />
                    )}
                    {isSaving && <p className="mt-1 text-[11px] font-bold text-slate-400">Saving…</p>}
                  </div>

                  {/* Options — directly editable */}
                  <div className="mt-3 space-y-2">
                    {opts.slice(0, 4).map((opt, oi) => {
                      const isCorrect = draft.correctIndex === oi;
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${isCorrect ? "border-[#2f6bce] bg-[#eff6ff] admin-dark:border-[#2f6bce] admin-dark:bg-[#1a3a78]/30" : "border-[#e2e8f0] bg-[#f8fbff] hover:border-[#93c5fd] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]"}`}
                        >
                          <button
                            type="button"
                            aria-label={`Mark option ${String.fromCharCode(65 + oi)} as correct`}
                            onClick={() => void handleCorrectChange(index, oi)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold ${isCorrect ? "border-[#1a3a78] bg-[#1a3a78] text-white admin-dark:border-[#3b82f6] admin-dark:bg-[#3b82f6]" : "border-slate-300 bg-white text-slate-500 admin-dark:border-zinc-600 admin-dark:bg-[#112544]"}`}
                          >
                            {isCorrect ? "●" : "○"}
                          </button>
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${isCorrect ? "bg-[#1a3a78] text-white admin-dark:bg-[#3b82f6]" : "bg-white text-slate-500 border border-slate-200 admin-dark:bg-[#1e3a65] admin-dark:text-slate-300"}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <input
                            value={opt}
                            onChange={(e) => {
                              const nextOpts = [...opts];
                              nextOpts[oi] = e.target.value;
                              setDrafts((prev) => ({ ...prev, [index]: { ...draft, options: nextOpts.slice(0, 4) } }));
                            }}
                            onBlur={() => void persistSlot(index)}
                            placeholder=""
                            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none admin-dark:text-zinc-200 admin-dark:placeholder:text-slate-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Image upload — small, per question */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={imageUploadingSlot === index}
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute("data-slot", String(index));
                          fileInputRef.current.click();
                        }
                      }}
                      className="rounded-lg border border-[#dbeafe] bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-[#eff6ff] disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300"
                    >
                      {imageUploadingSlot === index ? "Uploading…" : "Image Upload"}
                    </button>
                    {q?.questionImage && (
                      <span className="truncate text-xs text-slate-500 admin-dark:text-slate-400">{q.questionImage.slice(0, 32)}…</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );

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
      <div className="shrink-0 border-t border-[#dbeafe] bg-white p-3 text-center admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
        <button type="button" onClick={onClose} className={buttonSecondaryClass}>Close</button>
      </div>
    </div>
  );
}
