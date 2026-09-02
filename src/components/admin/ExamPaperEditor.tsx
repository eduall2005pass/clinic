"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  cardClass,
  inputClass,
  labelClass,
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

function ruleLabel(template: string | null | undefined): string {
  if (!template) return "—";
  if (template === "medical") return "Medical";
  if (template === "academic") return "Academic";
  if (template === "university") return "University";
  return template;
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
  const [editingId, setEditingId] = useState<number | null>(null);
  // For placeholder slots with no DB row yet, we use slot index as temp edit key
  const [placeholderEditingSlot, setPlaceholderEditingSlot] = useState<number | null>(null);
  const [form, setForm] = useState({
    subject: exam.subject || "",
    question: "",
    questionImage: "",
    options: [...EMPTY_OPTIONS] as string[],
    correctIndex: 0,
    explanation: "",
    marks: "1",
  });
  const [publishBusy, setPublishBusy] = useState(false);
  const [voiceSlot, setVoiceSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUploadingSlot, setImageUploadingSlot] = useState<number | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDetected, setImportDetected] = useState<Array<{ question: string; options: string[]; correctIndex: number | null }>| null>(null);
  const [importMeta, setImportMeta] = useState<{ totalHighlighted: number; imagesProcessed: number } | null>(null);

  // Keep bearer token for upload
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

  // Initial load
  useEffect(() => {
    void load();
  }, [load]);

  // Derived exam meta
  const totalSlots = useMemo(() => {
    const qCount = Number(exam.questionCount ?? exam.totalQuestions ?? 0);
    if (Number.isFinite(qCount) && qCount > 0) return Math.floor(qCount);
    if (questions) return questions.length;
    return 0;
  }, [exam.questionCount, exam.totalQuestions, questions]);

  // Fixed 30-question structure (Medical) — keep slots intact, no individual deletion.
  const isFixed30 = totalSlots === 30;

  const completedCount = useMemo(() => {
    if (!questions) return 0;
    return questions.filter(isCompleted).length;
  }, [questions]);

  // When totalSlots is known but questions less than slots, we create placeholders
  const displaySlots = useMemo(() => {
    if (!questions) return [];
    const list: Array<{ index: number; q: ExamQuestion | null }> = [];
    for (let i = 0; i < totalSlots; i += 1) {
      const q = i < questions.length ? questions[i] : null;
      list.push({ index: i, q });
    }
    // If backend already returns totalSlots items (including empty), questions.length === totalSlots, we just map.
    // If backend returns fewer but we still have totalSlots, placeholders are null.
    // Also if totalSlots==0, fallback to showing all questions.
    if (totalSlots === 0) {
      return questions.map((q, i) => ({ index: i, q }));
    }
    return list;
  }, [questions, totalSlots]);

  const allCompleted = totalSlots > 0 && completedCount >= totalSlots;
  const progressText = totalSlots > 0 ? `${completedCount} / ${totalSlots} Questions Completed` : `${completedCount} questions`;

  function resetForm() {
    setForm({
      subject: exam.subject || "",
      question: "",
      questionImage: "",
      options: [...EMPTY_OPTIONS],
      correctIndex: 0,
      explanation: "",
      marks: String(exam.marksPerQuestion ?? "1"),
    });
    setEditingId(null);
    setPlaceholderEditingSlot(null);
    setError(null);
  }

  function startEdit(q: ExamQuestion, slotIndex: number) {
    if (q.id === null) {
      // placeholder without id — treat as new at that slot position
      setPlaceholderEditingSlot(slotIndex);
      setEditingId(null);
      setForm({
        subject: q.subject || exam.subject || "",
        question: q.question || "",
        questionImage: q.questionImage || "",
        options: q.options.length >= 2 ? [...q.options] : [...q.options, ...EMPTY_OPTIONS.slice(q.options.length)],
        correctIndex: q.correctIndex ?? 0,
        explanation: q.explanation ?? "",
        marks: String(q.marks ?? exam.marksPerQuestion ?? 1),
      });
      setError(null);
      return;
    }
    setEditingId(q.id);
    setPlaceholderEditingSlot(null);
    const opts = q.options.length >= 2 ? [...q.options] : [...q.options, ...EMPTY_OPTIONS.slice(q.options.length)];
    // Ensure exactly 4 base, but allow extra
    setForm({
      subject: q.subject || exam.subject || "",
      question: q.question,
      questionImage: q.questionImage || "",
      options: opts,
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? "",
      marks: String(q.marks),
    });
    setError(null);
  }

  function startAddForSlot(slotIndex: number) {
    setPlaceholderEditingSlot(slotIndex);
    setEditingId(null);
    setForm({
      subject: exam.subject || "",
      question: "",
      questionImage: "",
      options: [...EMPTY_OPTIONS],
      correctIndex: 0,
      explanation: "",
      marks: String(exam.marksPerQuestion ?? "1"),
    });
    setError(null);
  }

  async function saveForm(slotIndex: number | null) {
    setError(null);
    if (!form.question.trim() || form.question.trim().length < 3) {
      setError("Question text is required (at least 3 characters).");
      return;
    }
    const nonEmpty = form.options.filter((o) => o.trim().length > 0);
    if (nonEmpty.length < 2) {
      setError("At least two non-empty options are required.");
      return;
    }
    if (form.correctIndex < 0 || form.correctIndex >= form.options.length || !form.options[form.correctIndex]?.trim()) {
      setError("Select a valid correct answer (click the circle).");
      return;
    }
    const marksNum = Number(form.marks);
    if (!Number.isFinite(marksNum) || marksNum < 0.5) {
      setError("Marks must be at least 0.5.");
      return;
    }
    setBusy(true);
    try {
      // Determine order: 1-indexed slot position
      const order = slotIndex !== null ? slotIndex + 1 : undefined;
      const body: Record<string, unknown> = {
        ...(editingId ? { id: editingId } : {}),
        examId: exam.id,
        subject: form.subject,
        question: form.question.trim(),
        questionImage: form.questionImage || null,
        question_image: form.questionImage || null,
        options: form.options,
        correctIndex: form.correctIndex,
        explanation: form.explanation || null,
        marks: marksNum,
        isActive: true,
        ...(order ? { order } : {}),
      };
      const res = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to save.");
        return;
      }
      resetForm();
      await load();
      onChanged?.();
      setNotice("Question saved.");
      setTimeout(() => setNotice(null), 2500);
    } finally {
      setBusy(false);
    }
  }

  async function quickSetCorrect(q: ExamQuestion, newIndex: number) {
    if (q.id === null) return;
    if (newIndex === q.correctIndex) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          id: q.id,
          examId: exam.id,
          subject: q.subject,
          question: q.question,
          questionImage: q.questionImage || null,
          options: q.options,
          correctIndex: newIndex,
          explanation: q.explanation || null,
          marks: q.marks,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to update correct answer.");
        return;
      }
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(id: number | null) {
    if (id === null) return;
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/admin/exams/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id }),
      });
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!questions) return;
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    const ids = next.map((x) => x.id).filter((x): x is number => x !== null);
    // If placeholders or mismatch, just reorder what we have; missing ids are ignored safely
    if (ids.length !== next.length) {
      // Some entries have no id (placeholders) — cannot reorder those meaningfully; only reorder real rows
      // So we reorder real rows only.
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exams/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ examId: exam.id, order: ids }),
      });
      const data = (await res.json().catch(() => null)) as { questions?: ExamQuestion[]; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to reorder.");
        return;
      }
      if (data?.questions) setQuestions(data.questions);
      else await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function moveToPosition(fromIdx: number, toIdxOneBased: number) {
    if (!questions) return;
    const toIdx = toIdxOneBased - 1;
    if (toIdx < 0 || toIdx >= questions.length || toIdx === fromIdx) return;
    const next = [...questions];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const ids = next.map((x) => x.id).filter((x): x is number => x !== null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/exams/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ examId: exam.id, order: ids }),
      });
      const data = (await res.json().catch(() => null)) as { questions?: ExamQuestion[]; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to reorder.");
        return;
      }
      if (data?.questions) setQuestions(data.questions);
      else await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function publishExam() {
    if (!allCompleted) {
      setError(`Complete all ${totalSlots} questions before publishing. ${progressText}.`);
      return;
    }
    setPublishBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ id: exam.id, status: "published" }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to publish.");
        return;
      }
      setNotice("Exam published successfully.");
      onChanged?.();
      setTimeout(() => setNotice(null), 2500);
    } finally {
      setPublishBusy(false);
    }
  }

  // Import from Image — Highlight-based detection
  async function handleImportImages(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setImportError("Select one or more image files (PNG/JPG/WebP).");
      return;
    }
    setImportBusy(true);
    setImportError(null);
    setImportDetected(null);
    setImportMeta(null);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("images", f));
      const res = await fetch("/api/admin/exams/questions/import", {
        method: "POST",
        headers: { Authorization: bearer as string },
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as {
        detected?: Array<{ question: string; options: string[] }>;
        meta?: { totalHighlighted: number; imagesProcessed: number };
        error?: string;
      } | null;
      if (!res.ok) {
        setImportError(data?.error ?? "Failed to detect questions.");
        return;
      }
      const detected = (data?.detected ?? []).map((d) => ({
        question: d.question,
        options: d.options.length >= 2 ? [...d.options] : [...d.options, ...Array(2 - d.options.length).fill("")],
        correctIndex: null as number | null,
      }));
      setImportDetected(detected);
      setImportMeta({ totalHighlighted: data?.meta?.totalHighlighted ?? detected.length, imagesProcessed: data?.meta?.imagesProcessed ?? list.length });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImportBusy(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function saveImportedQuestion(item: { question: string; options: string[]; correctIndex: number | null }, idx: number) {
    if (!item.question.trim() || item.question.trim().length < 3) {
      setImportError(`Question ${idx + 1}: text required.`);
      return;
    }
    const nonEmpty = item.options.filter((o) => o.trim().length > 0);
    if (nonEmpty.length < 2) {
      setImportError(`Question ${idx + 1}: at least two options required.`);
      return;
    }
    if (item.correctIndex === null || item.correctIndex < 0 || item.correctIndex >= item.options.length || !item.options[item.correctIndex]?.trim()) {
      setImportError(`Question ${idx + 1}: select the correct answer manually.`);
      return;
    }
    if (totalSlots > 0 && questions && questions.filter(isCompleted).length >= totalSlots) {
      setImportError(`Cannot add more than fixed ${totalSlots} questions.`);
      return;
    }
    setBusy(true);
    setImportError(null);
    try {
      const res = await fetch("/api/admin/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          examId: exam.id,
          subject: exam.subject || "",
          question: item.question.trim(),
          questionImage: null,
          options: item.options,
          correctIndex: item.correctIndex,
          explanation: null,
          marks: Number(exam.marksPerQuestion ?? 1) || 1,
          isActive: true,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setImportError(data?.error ?? "Failed to save question.");
        return;
      }
      // Remove from detected list after successful save
      setImportDetected((prev) => (prev ? prev.filter((_, i) => i !== idx) : null));
      await load();
      onChanged?.();
      setNotice(`Question ${idx + 1} saved.`);
      setTimeout(() => setNotice(null), 2000);
    } finally {
      setBusy(false);
    }
  }

  // Voice input
  function handleVoice(slotIndex: number, currentText: string, onUpdate: (t: string) => void) {
    const w = window as unknown as Record<string, unknown>;
    const Rec = (w["SpeechRecognition"] || w["webkitSpeechRecognition"]) as unknown as
      | (new () => {
          lang: string;
          interimResults: boolean;
          onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
          onerror: (() => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!Rec) {
      setError("Voice input not supported in this browser. Use Chrome/Edge.");
      return;
    }
    if (voiceSlot !== null) {
      setVoiceSlot(null);
      return;
    }
    try {
      const rec = new Rec();
      rec!.lang = "en-US";
      rec!.interimResults = false;
      setVoiceSlot(slotIndex);
      rec!.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) onUpdate(currentText ? `${currentText} ${transcript}` : transcript);
        setVoiceSlot(null);
      };
      rec!.onerror = () => {
        setVoiceSlot(null);
        setError("Voice recognition failed.");
      };
      rec!.onend = () => setVoiceSlot(null);
      rec!.start();
    } catch {
      setVoiceSlot(null);
      setError("Voice input failed to start.");
    }
  }

  // Image upload
  async function handleImageUpload(file: File, slotIndex: number, isEditing: boolean) {
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
      if (isEditing) {
        setForm((prev) => ({ ...prev, questionImage: data.url! }));
      } else {
        // Directly update the question's image if not editing
        const q = displaySlots[slotIndex]?.q;
        if (q && q.id !== null) {
          setBusy(true);
          const saveRes = await fetch("/api/admin/exams/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              id: q.id,
              examId: exam.id,
              subject: q.subject,
              question: q.question,
              questionImage: data.url,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation || null,
              marks: q.marks,
            }),
          });
          const saveData = (await saveRes.json().catch(() => null)) as { error?: string } | null;
          if (!saveRes.ok) throw new Error(saveData?.error || "Failed to save image.");
          await load();
          onChanged?.();
        }
      }
      setNotice("Image uploaded.");
      setTimeout(() => setNotice(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setImageUploadingSlot(null);
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const headerRule = ruleLabel((exam.ruleTemplate ?? exam.rule_template) as string | null);
  const headerTotalMarks = exam.totalMarks ?? 0;
  const headerDuration = exam.durationMinutes ?? 0;

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
        if (file && slotIndex >= 0) {
          const isEditing = editingId !== null || placeholderEditingSlot === slotIndex;
          void handleImageUpload(file, slotIndex, isEditing);
        }
      }}
    />
  );

  const headerBlock = (
    <div className={embedded ? "rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] sm:p-5" : "shrink-0 border-b border-[#dbeafe] bg-white shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]"}>
      <div className={embedded ? "flex flex-col gap-3" : "mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5"}>
        {!embedded && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold leading-tight text-[#0b1e3a] admin-dark:text-white sm:text-xl">{exam.title}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 admin-dark:text-slate-400">Exam Paper — Single page scroll · All questions vertical</p>
            </div>
            <button type="button" onClick={onClose} className={buttonSecondaryClass} aria-label="Close paper">Close</button>
          </div>
        )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#e0e7ff] bg-[#f8fbff] p-3 text-xs admin-dark:border-[#1e3a65] admin-dark:bg-[#132a4f] sm:grid-cols-5">
            <div className="rounded-lg bg-white px-3 py-2 admin-dark:bg-[#0f2547]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Exam Name</p>
              <p className="mt-0.5 truncate font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{exam.title}</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 admin-dark:bg-[#0f2547]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Questions</p>
              <p className="mt-0.5 font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{totalSlots || "—"}</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 admin-dark:bg-[#0f2547]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Marks</p>
              <p className="mt-0.5 font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{headerTotalMarks}</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 admin-dark:bg-[#0f2547]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Duration</p>
              <p className="mt-0.5 font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{headerDuration} min</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 admin-dark:bg-[#0f2547]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Rule Template</p>
              <p className="mt-0.5 font-bold text-[#0b1e3a] admin-dark:text-zinc-100">{headerRule}</p>
            </div>
          </div>

          {/* Progress + controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-extrabold ${allCompleted ? "text-emerald-600" : "text-amber-600"}`}>{progressText}</p>
                <p className="text-[11px] font-semibold text-slate-500">{completedCount}/{totalSlots}</p>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 admin-dark:bg-[#1e3a65]">
                <div
                  className={`h-full rounded-full transition-all ${allCompleted ? "bg-emerald-500" : "bg-[#2f6bce]"}`}
                  style={{ width: totalSlots ? `${Math.round((completedCount / totalSlots) * 100)}%` : "0%" }}
                />
              </div>
              {!allCompleted && totalSlots > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-amber-600">Complete all slots before publishing — missing slots show “Not Added”.</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={publishBusy || !allCompleted}
                onClick={() => void publishExam()}
                title={!allCompleted ? `Complete ${totalSlots - completedCount} more question(s) to publish` : "Publish exam to students"}
                className={`${buttonPrimaryClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {publishBusy ? "Publishing…" : exam.status === "published" ? "Published ✓" : "Publish"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void load()}
                className={buttonSecondaryClass}
                title="Refresh questions"
              >
                ↻ Refresh
              </button>
              <button type="button" onClick={onClose} className={buttonSecondaryClass}>
                Save & Close
              </button>
            </div>
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 admin-dark:border-red-900/40 admin-dark:bg-red-500/10 admin-dark:text-red-300">{error}</p>}
          {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 admin-dark:border-emerald-900/30 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-300">{notice}</p>}
          {embedded && (
            <div className="flex flex-wrap gap-2">
              {!allCompleted && totalSlots > 0 && <p className="text-[11px] font-semibold text-amber-600">Complete all slots before publishing — missing slots show “Not Added”.</p>}
            </div>
          )}
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
              {/* Import from Image — Highlight-based detection */}
              <div className={`${cardClass} mb-4 p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-zinc-100">Question Creation Methods</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 admin-dark:text-slate-400">
                      <span className="font-bold text-[#1a3a78] admin-dark:text-[#93c5fd]">Add Manually</span> — use the slot editor below. &nbsp;|&nbsp; <span className="font-bold text-[#1a3a78] admin-dark:text-[#93c5fd]">Import from Image</span> — upload 1+ images, AI detects only highlighted questions.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <input ref={importFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple className="hidden" onChange={(e) => { const f = e.target.files; if (f && f.length) void handleImportImages(f); }} />
                    <button type="button" disabled={importBusy} onClick={() => importFileRef.current?.click()} className={`${buttonSecondaryClass} shrink-0`}>
                      {importBusy ? "Detecting…" : "Import from Image"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-dashed border-[#bfdbfe] bg-[#f8fbff] px-3 py-3 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]/60">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">How highlight detection works</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 admin-dark:text-slate-300">
                    Single image may contain 40–50 questions, but only <span className="rounded bg-yellow-200 px-1 font-extrabold text-yellow-800">highlighted</span> questions are imported. Example: 50 in image, 30 highlighted → <span className="font-bold text-emerald-600">30 Questions Detected</span>, 20 ignored. Highlight is selection marker only — not the correct answer.
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">AI extracts only: Question text + Options (A-D). You will select the Correct Answer manually in review.</p>
                  <p className="mt-1 text-[11px] font-semibold text-amber-600">Do NOT auto-extract: Correct Answer, Explanation, Subject, Marks, Time, Person, Course, Exam Type.</p>
                </div>
                {importError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 admin-dark:border-red-900/30 admin-dark:bg-red-500/10">{importError}</p>}
                {importMeta && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 admin-dark:border-emerald-900/20 admin-dark:bg-emerald-500/10">{importMeta.totalHighlighted} Questions Detected — from {importMeta.imagesProcessed} image(s), highlighted only, non-highlighted ignored</p>}
              </div>

              {/* Review after detection — SAME Question Card UI as manual */}
              {importDetected && importDetected.length > 0 && (
                <div className="mb-4">
                  <h4 className="px-1 text-xs font-extrabold uppercase tracking-widest text-[#1a3a78] admin-dark:text-[#93c5fd]">Review Detected Questions — Same Card UI</h4>
                  <p className="mt-1 px-1 text-[11px] font-semibold text-slate-500">Detected questions appear exactly like manually created cards. Select the correct answer manually, then Save. Not auto-finalized.</p>
                  <ol className="mt-3 space-y-3">
                    {importDetected.map((item, idx) => (
                      <li key={`import-${idx}`} className={`rounded-2xl border bg-white shadow-sm admin-dark:bg-[#112544] ${item.correctIndex !== null ? "border-[#dbeafe] admin-dark:border-[#1e3a65]" : "border-amber-300 border-dashed bg-amber-50/40 admin-dark:border-amber-500/30 admin-dark:bg-[#1a2a3a]"}`}>
                        <div className="flex items-start justify-between gap-2 border-b border-[#eef4ff] px-4 py-3 admin-dark:border-[#1e3a65]/60">
                          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-xs text-white">{String(idx + 1).padStart(2, "0")}</span>
                            <span className="text-amber-700 admin-dark:text-amber-300">Detected — Review & Select Answer</span>
                          </p>
                          <button type="button" onClick={() => setImportDetected((prev) => (prev ? prev.filter((_, i) => i !== idx) : null))} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600">✕ Remove</button>
                        </div>
                        <div className="px-4 py-4 sm:px-5">
                          <textarea rows={2} className={`${inputClass} font-semibold`} value={item.question} onChange={(e) => setImportDetected((prev) => prev ? prev.map((it, i) => i === idx ? { ...it, question: e.target.value } : it) : null)} placeholder="Question text (extracted)" />
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {item.options.map((opt, oi) => (
                              <div key={oi} className="flex gap-2">
                                <button type="button" onClick={() => setImportDetected((prev) => prev ? prev.map((it, i) => i === idx ? { ...it, correctIndex: oi } : it) : null)} className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border-2 text-xs font-extrabold ${item.correctIndex === oi ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400"}`} title="Select correct answer manually">○</button>
                                <input className={inputClass} value={opt} onChange={(e) => setImportDetected((prev) => prev ? prev.map((it, i) => i === idx ? { ...it, options: it.options.map((o, j) => j === oi ? e.target.value : o) } : it) : null)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" disabled={busy || item.correctIndex === null} onClick={() => void saveImportedQuestion(item, idx)} className={buttonPrimaryClass}>Save to Slot</button>
                            <span className="self-center text-[11px] font-semibold text-slate-500">{item.correctIndex === null ? "Select correct answer before saving" : `Correct: ${String.fromCharCode(65 + (item.correctIndex ?? 0))} — will behave like manual question after save`}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={importDetected.length === 0} onClick={() => setImportDetected(null)} className={buttonSecondaryClass}>Dismiss Review</button>
                    <span className="self-center text-xs font-semibold text-slate-500">Auto-detected cards use SAME UI as manual — after Save they appear in the slot list below.</span>
                  </div>
                </div>
              )}

              <ol className="space-y-4">
              {displaySlots.map(({ index, q }) => {
                const slotNumber = index + 1;
                const completed = isCompleted(q);
                const isEditingThis = (q?.id !== null && editingId === q?.id) || placeholderEditingSlot === index;
                const hasImage = !!(q?.questionImage);
                const showAdd = !q || q.id === null || !completed;

                return (
                  <li
                    key={q?.id ?? `slot-${index}`}
                    className={`rounded-2xl border bg-white shadow-sm transition admin-dark:bg-[#112544] ${completed ? "border-[#dbeafe] admin-dark:border-[#1e3a65]" : "border-dashed border-amber-300 bg-amber-50/40 admin-dark:border-amber-500/30 admin-dark:bg-[#1a2a3a]"}`}
                  >
                    {/* Slot header */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#eef4ff] px-4 py-3 admin-dark:border-[#1e3a65]/60">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest">
                          <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs ${completed ? "bg-[#1a3a78] text-white admin-dark:bg-[#234e9f]" : "bg-amber-500 text-white"}`}>
                            {pad(slotNumber)}
                          </span>
                          <span className={completed ? "text-[#0b1e3a] admin-dark:text-zinc-100" : "text-amber-700 admin-dark:text-amber-300"}>
                            Question {pad(slotNumber)} — {completed ? "Added" : "Not Added"}
                          </span>
                          {completed && q && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 admin-dark:bg-[#0f2547] admin-dark:text-slate-300">
                              {q.marks} mark{q.marks === 1 ? "" : "s"}
                            </span>
                          )}
                        </p>
                        {!completed && (
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">Fill question text, options and correct answer to complete this slot.</p>
                        )}
                      </div>

                      {/* Compact controls — never disturb paper look */}
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {/* Reorder */}
                        {q?.id !== null && questions && (
                          <>
                            <button
                              type="button"
                              disabled={busy || index === 0}
                              onClick={() => void moveQuestion(index, -1)}
                              className="rounded-lg border border-[#dbeafe] bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-[#eff6ff] disabled:opacity-30 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300"
                              title="Move up"
                              aria-label={`Move question ${slotNumber} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={busy || index === (questions?.length ?? 0) - 1}
                              onClick={() => void moveQuestion(index, 1)}
                              className="rounded-lg border border-[#dbeafe] bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-[#eff6ff] disabled:opacity-30 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300"
                              title="Move down"
                              aria-label={`Move question ${slotNumber} down`}
                            >
                              ↓
                            </button>
                            {/* Move to position */}
                            <label className="flex items-center gap-1 rounded-lg border border-[#dbeafe] bg-white px-1.5 py-1 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]" title="Move to position">
                              <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Go</span>
                              <input
                                type="number"
                                min={1}
                                max={totalSlots}
                                placeholder="#"
                                className="w-10 rounded bg-transparent text-center text-xs font-bold outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const v = Number((e.target as HTMLInputElement).value);
                                    if (v >= 1 && v <= totalSlots) void moveToPosition(index, v);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }}
                              />
                            </label>
                          </>
                        )}

                        {/* Image Upload */}
                        <button
                          type="button"
                          disabled={busy || imageUploadingSlot === index}
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute("data-slot", String(index));
                              fileInputRef.current.click();
                            }
                          }}
                          className="rounded-lg border border-[#dbeafe] bg-white p-1.5 text-slate-600 hover:bg-[#eff6ff] disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300"
                          title="Upload image"
                          aria-label="Upload image"
                        >
                          {imageUploadingSlot === index ? "…" : "🖼"}
                        </button>

                        {/* Voice Input */}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (isEditingThis) {
                              handleVoice(index, form.question, (t) => setForm((p) => ({ ...p, question: t })));
                            } else if (q?.id !== null && q) {
                              // quick voice fill for non-editing: start edit with voice
                              startEdit(q, index);
                              setTimeout(() => handleVoice(index, form.question, (t) => setForm((p) => ({ ...p, question: t }))), 50);
                            } else {
                              startAddForSlot(index);
                              setTimeout(() => handleVoice(index, "", (t) => setForm((p) => ({ ...p, question: t }))), 50);
                            }
                          }}
                          className={`rounded-lg border p-1.5 text-xs font-bold ${voiceSlot === index ? "border-red-300 bg-red-50 text-red-600 animate-pulse" : "border-[#dbeafe] bg-white text-slate-600 hover:bg-[#eff6ff] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-slate-300"}`}
                          title="Voice input for question"
                          aria-label="Voice input"
                        >
                          🎙
                        </button>

                        {completed ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => q && startEdit(q, index)}
                              className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-2.5 py-1 text-xs font-bold text-[#1a3a78] hover:bg-[#dbeafe] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#93c5fd]"
                            >
                              Edit
                            </button>
                            {/* Fixed 30-question structure: no individual deletion — edit to correct instead. */}
                            {!isFixed30 && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void removeQuestion(q?.id ?? null)}
                                className={buttonDangerClass}
                                title="Delete question"
                                aria-label={`Delete question ${slotNumber}`}
                              >
                                ✕
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (q && q.id !== null) startEdit(q, index);
                              else startAddForSlot(index);
                            }}
                            className="rounded-lg bg-[#1a3a78] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#123060] admin-dark:bg-[#234e9f]"
                          >
                            {q && q.id !== null ? "Complete" : "+ Add"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Paper body */}
                    <div className="px-4 py-4 sm:px-5">
                      {!completed ? (
                        <div className="rounded-xl border border-dashed border-amber-200 bg-white px-4 py-6 text-center admin-dark:border-amber-500/20 admin-dark:bg-[#0f2547]/50">
                          <p className="text-sm font-bold text-slate-600 admin-dark:text-slate-300">
                            {q && q.id !== null && q.question ? "Incomplete — finish editing to mark as Added." : `Slot ${pad(slotNumber)} is empty.`}
                          </p>
                          {q && q.id !== null && q.questionImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={q.questionImage} alt="Question" className="mx-auto mt-3 max-h-32 rounded-lg border border-neutral-200 object-contain admin-dark:border-zinc-700" />
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-extrabold leading-relaxed text-[#0b1e3a] admin-dark:text-zinc-100 sm:text-[15px]">
                            <span className="mr-1 text-[#2f6bce]">{pad(slotNumber)}.</span> {q!.question}
                          </p>
                          {q!.questionImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={q!.questionImage} alt="Question image" className="mt-3 max-h-48 w-auto rounded-xl border border-neutral-200 object-contain admin-dark:border-zinc-700" />
                          )}
                          {/* Options — circle style like student exam */}
                          <div className="mt-4 space-y-2">
                            {q!.options.map((opt, oi) => {
                              const correct = oi === q!.correctIndex;
                              return (
                                <button
                                  key={oi}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void quickSetCorrect(q!, oi)}
                                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                                    correct
                                      ? "border-[#2f6bce] bg-[#eff6ff] text-[#0b1e3a] admin-dark:border-[#2f6bce] admin-dark:bg-[#1a3a78]/40 admin-dark:text-zinc-100"
                                      : "border-[#e2e8f0] bg-[#f8fbff] text-slate-700 hover:border-[#93c5fd] admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-zinc-300"
                                  }`}
                                  title={correct ? "Correct answer (click to change)" : "Click circle to mark as correct"}
                                >
                                  {/* Circle */}
                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold ${
                                      correct
                                        ? "border-[#1a3a78] bg-[#1a3a78] text-white admin-dark:border-[#3b82f6] admin-dark:bg-[#3b82f6]"
                                        : "border-slate-300 bg-white text-slate-500 admin-dark:border-zinc-600 admin-dark:bg-[#112544]"
                                    }`}
                                  >
                                    {correct ? "●" : "○"}
                                  </span>
                                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${correct ? "bg-[#1a3a78] text-white admin-dark:bg-[#3b82f6]" : "bg-white text-slate-500 border border-slate-200 admin-dark:bg-[#1e3a65] admin-dark:text-slate-300"}`}>
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  <span className={`min-w-0 flex-1 font-semibold ${correct ? "text-[#0b1e3a] admin-dark:text-white" : ""}`}>{opt || <span className="italic text-slate-400">— empty —</span>}</span>
                                  {correct && <span className="ml-auto shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">Correct</span>}
                                </button>
                              );
                            })}
                          </div>
                          {q!.explanation && (
                            <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800 admin-dark:bg-sky-500/10 admin-dark:text-sky-200">
                              <span className="font-extrabold">Explanation: </span>{q!.explanation}
                            </div>
                          )}
                        </>
                      )}

                      {/* Inline edit form — compact, does not disturb paper look when collapsed */}
                      {isEditingThis && (
                        <div className="mt-4 rounded-xl border border-[#bfdbfe] bg-[#f8fbff] p-4 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547]">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-[#1a3a78] admin-dark:text-[#93c5fd]">
                            {q?.id !== null && completed ? "Edit Question" : "Add / Complete Question"} — {pad(slotNumber)}
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            <div>
                              <label className={labelClass} htmlFor={`eq-text-${index}`}>Question text</label>
                              <div className="flex gap-2">
                                <textarea
                                  id={`eq-text-${index}`}
                                  rows={2}
                                  className={`${inputClass} flex-1 font-semibold`}
                                  value={form.question}
                                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                                  placeholder="Type the question…"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleVoice(index, form.question, (t) => setForm((p) => ({ ...p, question: t })))}
                                  className={`h-fit shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${voiceSlot === index ? "border-red-300 bg-red-50 text-red-600 animate-pulse" : "border-[#dbeafe] bg-white text-slate-600"}`}
                                  title="Voice input"
                                >
                                  🎙
                                </button>
                              </div>
                            </div>

                            {/* Image field */}
                            <div>
                              <label className={labelClass}>Question image (optional)</label>
                              <div className="flex gap-2">
                                <input className={`${inputClass} flex-1`} value={form.questionImage} onChange={(e) => setForm({ ...form, questionImage: e.target.value })} placeholder="Paste image URL or upload" />
                                <button
                                  type="button"
                                  disabled={imageUploadingSlot === index}
                                  onClick={() => {
                                    if (fileInputRef.current) {
                                      fileInputRef.current.setAttribute("data-slot", String(index));
                                      fileInputRef.current.click();
                                    }
                                  }}
                                  className={buttonSecondaryClass}
                                >
                                  {imageUploadingSlot === index ? "…" : "⬆ Upload"}
                                </button>
                              </div>
                              {form.questionImage && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.questionImage} alt="Preview" className="mt-2 h-20 w-auto rounded-lg border border-neutral-200 object-contain admin-dark:border-zinc-700" />
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {form.options.map((opt, oi) => (
                                <div key={oi}>
                                  <label className={labelClass} htmlFor={`eq-opt-${index}-${oi}`}>
                                    Option {String.fromCharCode(65 + oi)}
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setForm({ ...form, correctIndex: oi })}
                                      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border-2 text-xs font-extrabold ${form.correctIndex === oi ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400"}`}
                                      title="Mark as correct (admin only, hidden from students)"
                                      aria-label={`Mark option ${String.fromCharCode(65 + oi)} as correct`}
                                    >
                                      {form.correctIndex === oi ? "●" : "○"}
                                    </button>
                                    <input
                                      id={`eq-opt-${index}-${oi}`}
                                      className={inputClass}
                                      value={opt}
                                      onChange={(e) => setForm({ ...form, options: form.options.map((v, i) => (i === oi ? e.target.value : v)) })}
                                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ""] })} className={buttonSecondaryClass}>+ Add option</button>
                              {form.options.length > 2 && (
                                <button type="button" onClick={() => setForm({ ...form, options: form.options.slice(0, -1), correctIndex: Math.min(form.correctIndex, form.options.length - 2) })} className={buttonSecondaryClass}>− Remove last</button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className={labelClass} htmlFor={`eq-marks-${index}`}>Marks</label>
                                <input id={`eq-marks-${index}`} type="number" step="0.5" min="0.5" className={inputClass} value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
                              </div>
                              <div>
                                <label className={labelClass} htmlFor={`eq-subject-${index}`}>Subject (optional)</label>
                                <input id={`eq-subject-${index}`} className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Biology" />
                              </div>
                            </div>
                            <div>
                              <label className={labelClass} htmlFor={`eq-explain-${index}`}>Explanation (optional)</label>
                              <textarea id={`eq-explain-${index}`} rows={2} className={inputClass} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Shown after submission if allowed" />
                            </div>
                            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                            <div className="flex flex-wrap gap-2">
                              <button type="button" disabled={busy} onClick={() => void saveForm(index)} className={buttonPrimaryClass}>
                                {busy ? "Saving…" : "Save Question"}
                              </button>
                              <button type="button" disabled={busy} onClick={resetForm} className={buttonSecondaryClass}>Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            </>
           )}

           {/* Bottom publish hint */}
          {questions && totalSlots > 0 && (
            <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white p-4 text-center admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
              <p className="text-xs font-bold text-slate-600 admin-dark:text-slate-300">
                {allCompleted ? "All questions completed — you can publish this paper." : `Add ${totalSlots - completedCount} more question(s) to unlock publishing.`}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" disabled={publishBusy || !allCompleted} onClick={() => void publishExam()} className={`${buttonPrimaryClass} disabled:opacity-40`}>
                  {publishBusy ? "Publishing…" : "Publish Paper"}
                </button>
                {!embedded && (
                  <button type="button" onClick={onClose} className={buttonSecondaryClass}>Save & Close</button>
                )}
              </div>
            </div>
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
