"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { parsePastedMcqs } from "@/lib/paste-mcq-parser";
import type { PdfMaterialHeader, PdfMaterialQuestion, PdfMaterial } from "@/lib/pdf-materials";
import { paginateQuestions, type PaginatedPage, normalizeAnswer } from "@/components/admin/MaterialPdf/pagination";

// Dynamic imports for jspdf/html2canvas to avoid SSR issues
type Step = "paste" | "editor" | "preview";

const DEFAULT_HEADER: PdfMaterialHeader = {
  title: "",
  subject: "",
  chapter: "",
  batch: "",
  institution: "MediSpark",
  headerEnabled: true,
  showPageNumbers: true,
};

function uid() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mapParserToQuestions(parsed: ReturnType<typeof parsePastedMcqs>): PdfMaterialQuestion[] {
  return parsed.map((p, idx) => {
    let ans = "";
    if (p.correctIndex !== null && p.correctIndex >= 0 && p.correctIndex < 4) {
      ans = String.fromCharCode(65 + p.correctIndex);
    }
    return {
      id: uid(),
      qNumber: idx + 1,
      question: p.question || "",
      options: [...p.options] as [string, string, string, string],
      answer: ans,
      needsReview: p.needsReview,
      issues: p.issues ?? [],
    };
  });
}

function sanitizeQuestions(questions: PdfMaterialQuestion[]): PdfMaterialQuestion[] {
  return questions.map((q, idx) => ({ ...q, qNumber: idx + 1 }));
}

export default function MaterialPdfGeneratorPage() {
  const { user, authLoading } = useAuth();
  const [step, setStep] = useState<Step>("paste");
  const [pasteText, setPasteText] = useState("");
  const [questions, setQuestions] = useState<PdfMaterialQuestion[]>([]);
  const [header, setHeader] = useState<PdfMaterialHeader>({ ...DEFAULT_HEADER });
  const [answerLang, setAnswerLang] = useState<"en" | "bn">("bn"); // display preference for answer key
  const [detection, setDetection] = useState<{ total: number; ok: number; review: number } | null>(null);
  const [savedMaterials, setSavedMaterials] = useState<PdfMaterial[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPasteHelp, setShowPasteHelp] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load saved materials
  const loadSaved = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/pdf-materials", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { materials?: PdfMaterial[] };
        setSavedMaterials(Array.isArray(data.materials) ? data.materials : []);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void loadSaved();
  }, [authLoading, user, loadSaved]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const pages: PaginatedPage[] = useMemo(() => {
    const usable = header.headerEnabled ? 790 : 860;
    return paginateQuestions(questions, usable);
  }, [questions, header.headerEnabled]);

  const handleDetect = () => {
    if (!pasteText.trim()) {
      setToast("Please paste MCQs first.");
      return;
    }
    const parsed = parsePastedMcqs(pasteText);
    if (parsed.length === 0) {
      setToast("No MCQs detected. Check format.");
      return;
    }
    const mapped = mapParserToQuestions(parsed);
    setQuestions(sanitizeQuestions(mapped));
    const ok = mapped.filter((m) => !m.needsReview).length;
    setDetection({ total: mapped.length, ok, review: mapped.length - ok });
    setStep("editor");
    setToast(`${mapped.length} questions detected`);
    // scroll
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddQuestion = () => {
    const n: PdfMaterialQuestion = {
      id: uid(),
      qNumber: questions.length + 1,
      question: "",
      options: ["", "", "", ""],
      answer: "",
      needsReview: true,
      issues: ["New question — fill all fields"],
    };
    setQuestions((prev) => sanitizeQuestions([...prev, n]));
  };

  const handleDelete = (id: string) => {
    setQuestions((prev) => sanitizeQuestions(prev.filter((q) => q.id !== id)));
  };

  const handleUpdate = (id: string, patch: Partial<PdfMaterialQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const handleAnswerChange = (id: string, val: string) => {
    const norm = normalizeAnswer(val);
    // allow empty or valid
    const allowed = ["A", "B", "C", "D", "ক", "খ", "গ", "ঘ", ""];
    // if user typed bn, keep bn; if en keep en
    const final = allowed.includes(val.trim()) ? val.trim() : allowed.includes(norm) ? norm : val.trim().slice(0, 2);
    handleUpdate(id, { answer: final });
  };

  const handleSave = async () => {
    if (questions.length === 0) {
      setToast("No questions to save.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        id: editingId ?? undefined,
        payload: {
          header: {
            ...header,
            title: header.title || "Untitled Material",
          },
          questions: sanitizeQuestions(questions),
        },
      };
      const res = await fetch("/api/admin/pdf-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { material?: PdfMaterial; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      setToast(editingId ? "Material updated" : "Material saved");
      setEditingId(data.material?.id ?? null);
      void loadSaved();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadMaterial = (m: PdfMaterial) => {
    const p = m.payload;
    setHeader(p.header);
    setQuestions(sanitizeQuestions(p.questions));
    setEditingId(m.id);
    setStep("editor");
    setDetection({ total: p.questions.length, ok: p.questions.filter((q) => !q.needsReview).length, review: p.questions.filter((q) => q.needsReview).length });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setToast(`Loaded: ${m.title}`);
  };

  const handleDeleteSaved = async (id: number) => {
    if (!confirm("Delete this material?")) return;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/pdf-materials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setToast("Deleted");
      void loadSaved();
      if (editingId === id) setEditingId(null);
    }
  };

  const handleGeneratePdf = async () => {
    if (questions.length === 0) {
      setToast("No questions to generate.");
      return;
    }
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageEls = previewRef.current?.querySelectorAll<HTMLElement>(".a4-page");
      if (!pageEls || pageEls.length === 0) throw new Error("Preview not ready");
      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      const fileName = (header.title || "MediSpark-Material").replace(/[^a-zA-Z0-9\u0980-\u09FF\-_ ]/g, "").trim().slice(0, 60) || "MediSpark-Material";
      pdf.save(`${fileName}.pdf`);
      setToast("PDF downloaded");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (questions.length === 0) {
      setToast("No questions");
      return;
    }
    setGenerating(true);
    try {
      const [{ default: html2canvas }] = await Promise.all([import("html2canvas")]);
      // Build printable window with A4 pages as images? Simpler: open print window with innerHTML
      const pagesHtml = previewRef.current?.innerHTML ?? "";
      const win = window.open("", "_blank");
      if (!win) throw new Error("Popup blocked. Allow popups.");
      win.document.write(`
        <html><head><title>${header.title || "MediSpark Material"}</title>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          *{box-sizing:border-box}
          body{margin:0;background:#525659;display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;font-family:'Hind Siliguri','Noto Sans Bengali',sans-serif}
          .a4-page{width:210mm;min-height:297mm;background:white;box-shadow:0 4px 24px rgba(0,0,0,.2);padding:12mm 14mm 10mm 14mm;position:relative}
          @media print{ body{background:white;padding:0;gap:0} .a4-page{box-shadow:none;page-break-after:always} .no-print{display:none}}
        </style></head><body>${pagesHtml}<div class="no-print" style="position:fixed;top:12px;right:12px;display:flex;gap:8px"><button onclick="window.print()" style="background:#0b1e3a;color:white;padding:10px 18px;border-radius:10px;border:none;font-weight:700;cursor:pointer">Print / Save PDF</button><button onclick="window.close()" style="background:white;border:1px solid #cbd5e1;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer">Close</button></div></body></html>
      `);
      win.document.close();
      // html2canvas import just to ensure fonts loaded; not needed
      void html2canvas;
      setToast("Preview opened");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleNewMaterial = () => {
    setQuestions([]);
    setHeader({ ...DEFAULT_HEADER });
    setPasteText("");
    setDetection(null);
    setEditingId(null);
    setStep("paste");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) return <AccessLoading label="Loading Material PDF Generator…" />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      {/* Inject Bangla font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap'); .bangla{font-family:'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif}`}</style>

      <div className="mx-auto max-w-[1280px] px-3 py-6 sm:px-6 sm:py-8">
        {/* Header Bar */}
        <div className="rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#234e9f] admin-dark:text-[#93c5fd]">Admin Tool • Material PDF Generator</p>
              <h1 className="mt-1 text-xl font-extrabold text-[#0b1e3a] sm:text-2xl admin-dark:text-white">Material PDF Generator</h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm admin-dark:text-[#8da0c0]">
                Paste MCQs → Detect & Format → Editable A4 Preview → Generate PDF. Bangla + English fully supported. Page-specific answer keys, never-splitting MCQs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleNewMaterial}
                className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#0b1e3a] hover:bg-slate-50 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white"
              >
                + New Material
              </button>
              {editingId && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 admin-dark:bg-amber-900/30 admin-dark:text-amber-300">Editing #{editingId}</span>}
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {([
              { k: "paste", label: "1. Paste MCQs" },
              { k: "editor", label: "2. Detect & Edit" },
              { k: "preview", label: "3. A4 Preview & PDF" },
            ] as const).map((s) => (
              <button
                key={s.k}
                onClick={() => setStep(s.k)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  step === s.k
                    ? "bg-[#0b1e3a] text-white shadow admin-dark:bg-[#234e9f]"
                    : "bg-[#eff6ff] text-[#1a3a78] hover:bg-[#dbeafe] admin-dark:bg-[#0f2547] admin-dark:text-[#8da0c0]"
                }`}
              >
                {s.label}
              </button>
            ))}
            <span className="ml-auto hidden items-center gap-2 sm:flex">
              <span className="text-xs text-slate-400">Questions: {questions.length}</span>
              <span className="text-xs text-slate-400">• Pages: {pages.length}</span>
            </span>
          </div>

          {/* Detection summary */}
          {detection && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-900 px-3 py-1.5 font-bold text-white admin-dark:bg-white admin-dark:text-slate-900">
                {detection.total} Questions Detected
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 font-bold text-emerald-700 admin-dark:bg-emerald-900/30 admin-dark:text-emerald-300">
                {detection.ok} Parsed
              </span>
              {detection.review > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1.5 font-bold text-amber-700 admin-dark:bg-amber-900/30 admin-dark:text-amber-300">
                  {detection.review} Need Review
                </span>
              )}
            </div>
          )}
        </div>

        {/* STEP: PASTE */}
        {step === "paste" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
            <div className="rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
              <h2 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">Step 1 — Paste MCQs (Bulk)</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 admin-dark:text-[#8da0c0]">
                Paste 10 / 20 / 50 / 100+ MCQs at once. Supported numbering: <code className="rounded bg-slate-100 px-1 py-0.5">1.</code> <code className="rounded bg-slate-100 px-1 py-0.5">1)</code> <code className="rounded bg-slate-100 px-1 py-0.5">Q1</code> <code className="rounded bg-slate-100 px-1 py-0.5">Question 12)</code> etc. Your numbering will be normalized to Q1, Q2…
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 admin-dark:text-[#cbd5e1]">Paste Area</label>
                  <button onClick={() => setShowPasteHelp((v) => !v)} className="text-xs font-semibold text-[#234e9f] hover:underline admin-dark:text-[#93c5fd]">
                    {showPasteHelp ? "Hide format help" : "Show format help"}
                  </button>
                </div>
                {showPasteHelp && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 admin-dark:border-amber-900/40 admin-dark:bg-amber-900/20 admin-dark:text-amber-200">
                    <p className="font-bold">Example format:</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 font-mono text-[11px] leading-relaxed admin-dark:bg-[#0a162e]">
{`1. Which organelle is known as the powerhouse of the cell?
A. Nucleus
B. Mitochondria
C. Ribosome
D. Golgi body
Ans: B

2. মানবদেহে লোহিত রক্তকণিকার আয়ুষ্কাল কত দিন?
A. 60 দিন
B. 90 দিন
C. 120 দিন
D. 150 দিন
Ans: C`}
                    </pre>
                    <p className="mt-1">Tips: You can also mark correct with <code>*</code> after option, or omit Ans: and enter later in editor.</p>
                  </div>
                )}
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`1. Which organelle is known as the powerhouse...
A. Nucleus
B. Mitochondria
C. Ribosome
D. Golgi body
Ans: B

2. মানবদেহের সবচেয়ে বড় অঙ্গ কোনটি?
...`}
                  className="bangla mt-2 min-h-[360px] w-full resize-y rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-3 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#234e9f] focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleDetect}
                    disabled={!pasteText.trim()}
                    className="rounded-xl bg-[#0b1e3a] px-6 py-2.5 text-sm font-extrabold text-white shadow hover:bg-[#123060] disabled:opacity-40 admin-dark:bg-[#234e9f]"
                  >
                    Detect & Format →
                  </button>
                  <button
                    onClick={() => setPasteText("")}
                    className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white"
                  >
                    Clear
                  </button>
                  <span className="ml-auto self-center text-xs text-slate-400">{pasteText.length} chars • {pasteText.split("\n").filter(Boolean).length} lines</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                <h3 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">Document Header (Optional)</h3>
                <p className="mt-1 text-xs text-slate-500 admin-dark:text-[#8da0c0]">Shown on top of every A4 page if enabled. Leave empty for clean sheet.</p>
                <div className="mt-4 grid gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 admin-dark:text-[#cbd5e1]">
                    <input type="checkbox" checked={header.headerEnabled} onChange={(e) => setHeader({ ...header, headerEnabled: e.target.checked })} className="rounded" /> Enable Header
                  </label>
                  <input value={header.title} onChange={(e) => setHeader({ ...header, title: e.target.value })} placeholder="Material Title (e.g. Biology - Cell - MCQ 2026)" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#234e9f] admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={header.subject} onChange={(e) => setHeader({ ...header, subject: e.target.value })} placeholder="Subject" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white" />
                    <input value={header.chapter} onChange={(e) => setHeader({ ...header, chapter: e.target.value })} placeholder="Chapter" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={header.batch} onChange={(e) => setHeader({ ...header, batch: e.target.value })} placeholder="Batch" className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white" />
                    <input value={header.institution} onChange={(e) => setHeader({ ...header, institution: e.target.value })} placeholder="Institution" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white" />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 admin-dark:text-[#cbd5e1]">
                    <input type="checkbox" checked={header.showPageNumbers} onChange={(e) => setHeader({ ...header, showPageNumbers: e.target.checked })} className="rounded" /> Show Page Numbers (Footer)
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] to-white p-4 admin-dark:border-[#1e3a65] admin-dark:from-[#0f2547] admin-dark:to-[#112544]">
                <h4 className="text-xs font-extrabold text-[#0b1e3a] admin-dark:text-white">How it works</h4>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-600 admin-dark:text-[#8da0c0]">
                  <li>Paste bulk MCQs</li>
                  <li>Click Detect & Format — numbering normalized</li>
                  <li>Edit in editor (click to edit any field)</li>
                  <li>Switch to A4 Preview — live pagination</li>
                  <li>Generate PDF (Bangla-safe) + Save for later re-edit</li>
                </ol>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setStep("editor")} disabled={questions.length === 0} className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#0b1e3a] shadow hover:bg-slate-50 disabled:opacity-40 admin-dark:bg-[#1e3a65] admin-dark:text-white">Go to Editor</button>
                  <button onClick={() => setStep("preview")} disabled={questions.length === 0} className="flex-1 rounded-xl bg-[#0b1e3a] px-3 py-2 text-xs font-bold text-white hover:bg-[#123060] disabled:opacity-40 admin-dark:bg-[#234e9f]">A4 Preview</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: EDITOR */}
        {step === "editor" && (
          <div className="mt-6">
            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                <p className="text-sm font-bold text-slate-600 admin-dark:text-[#8da0c0]">No questions yet.</p>
                <p className="mt-1 text-xs text-slate-400">Go to Paste step and Detect MCQs first.</p>
                <button onClick={() => setStep("paste")} className="mt-4 rounded-xl bg-[#0b1e3a] px-5 py-2 text-sm font-bold text-white admin-dark:bg-[#234e9f]">Paste MCQs</button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#dbeafe] bg-white p-3 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                  <span className="text-xs font-bold text-slate-600 admin-dark:text-[#8da0c0]">{questions.length} Questions • {pages.length} A4 Pages (auto-paginated)</span>
                  <span className="ml-auto flex flex-wrap gap-2">
                    <label className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold admin-dark:bg-[#0f2547] admin-dark:text-[#8da0c0]">
                      Answer style
                      <select value={answerLang} onChange={(e) => setAnswerLang(e.target.value as "en" | "bn")} className="rounded-full bg-white px-2 py-0.5 text-xs font-bold outline-none admin-dark:bg-[#132a4f]">
                        <option value="bn">ক খ গ ঘ</option>
                        <option value="en">A B C D</option>
                      </select>
                    </label>
                    <button onClick={handleAddQuestion} className="rounded-xl bg-[#0b1e3a] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#123060] admin-dark:bg-[#234e9f]">+ Add Question</button>
                    <button onClick={() => setStep("preview")} className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Preview A4 →</button>
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm transition admin-dark:bg-[#112544] ${q.needsReview ? "border-amber-300 bg-amber-50/40 admin-dark:border-amber-900/50" : "border-[#dbeafe] admin-dark:border-[#1e3a65]"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0b1e3a] text-xs font-extrabold text-white admin-dark:bg-[#234e9f]">Q{q.qNumber}</span>
                        <div className="flex items-center gap-1.5">
                          {q.needsReview && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700 admin-dark:bg-amber-900/30 admin-dark:text-amber-300">Needs Review</span>}
                          {q.issues.length > 0 && <span title={q.issues.join("\n")} className="cursor-help text-amber-600">⚠</span>}
                          <button onClick={() => handleDelete(q.id)} className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 admin-dark:border-red-900/40 admin-dark:bg-transparent">Delete</button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Question (Bold in PDF)</label>
                        <textarea
                          value={q.question}
                          onChange={(e) => handleUpdate(q.id, { question: e.target.value })}
                          placeholder="Question text..."
                          rows={2}
                          className="bangla mt-1 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-2.5 text-sm font-bold leading-relaxed text-slate-900 outline-none focus:border-[#234e9f] focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white"
                        />
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(["A", "B", "C", "D"] as const).map((ltr, idx) => (
                          <label key={ltr} className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#cbd5e1] bg-slate-50 text-xs font-bold text-slate-700 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-[#8da0c0]">{ltr}</span>
                            <input
                              value={q.options[idx]}
                              onChange={(e) => {
                                const next = [...q.options] as [string, string, string, string];
                                next[idx] = e.target.value;
                                handleUpdate(q.id, { options: next });
                              }}
                              placeholder={`Option ${ltr}`}
                              className="bangla w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#234e9f] admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 admin-dark:text-[#cbd5e1]">
                          Answer
                          <input
                            value={q.answer}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="A / ক"
                            className="w-20 rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-center text-sm font-bold outline-none focus:border-[#234e9f] admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white"
                            list={`ans-list-${q.id}`}
                          />
                          <datalist id={`ans-list-${q.id}`}>
                            <option value="A" /><option value="B" /><option value="C" /><option value="D" />
                            <option value="ক" /><option value="খ" /><option value="গ" /><option value="ঘ" />
                          </datalist>
                          <span className="text-[11px] font-normal text-slate-400">(ক/খ/গ/ঘ or A/B/C/D)</span>
                        </label>
                        <button
                          onClick={() => {
                            const hasAns = q.answer.trim().length > 0;
                            handleUpdate(q.id, { needsReview: !hasAns ? true : false, issues: hasAns ? [] : q.issues });
                            if (hasAns) setToast(`Q${q.qNumber} marked ok`);
                          }}
                          className="ml-auto rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 admin-dark:border-emerald-900/40 admin-dark:bg-emerald-900/20 admin-dark:text-emerald-300"
                        >
                          {q.needsReview ? "Mark OK" : "Flag Review"}
                        </button>
                      </div>
                      {q.issues.length > 0 && <p className="mt-2 text-xs text-amber-700 admin-dark:text-amber-300">{q.issues.join(" • ")}</p>}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={handleAddQuestion} className="rounded-xl border border-[#dbeafe] bg-white px-4 py-2 text-sm font-bold text-[#0b1e3a] hover:bg-slate-50 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white">+ Add Question</button>
                  <button onClick={() => setStep("preview")} className="rounded-xl bg-[#0b1e3a] px-6 py-2 text-sm font-bold text-white hover:bg-[#123060] admin-dark:bg-[#234e9f]">Go to A4 Preview →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP: PREVIEW + PDF */}
        {step === "preview" && (
          <div className="mt-6">
            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
                <p className="text-sm font-bold text-slate-600 admin-dark:text-[#8da0c0]">No questions</p>
                <button onClick={() => setStep("paste")} className="mt-4 rounded-xl bg-[#0b1e3a] px-5 py-2 text-sm font-bold text-white">Paste MCQs first</button>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="sticky top-[64px] z-20 -mx-3 flex flex-wrap items-center gap-2 border-y border-[#dbeafe] bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:mx-0 sm:rounded-2xl sm:border admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]/95">
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs font-bold text-slate-600 sm:inline admin-dark:text-[#8da0c0]">{questions.length} Qs • {pages.length} Pages • A4</span>
                    <label className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold admin-dark:bg-[#0f2547]">
                      <span className="hidden sm:inline">Answers:</span>
                      <select value={answerLang} onChange={(e) => setAnswerLang(e.target.value as "en" | "bn")} className="rounded-full bg-white px-2 py-0.5 text-xs font-bold outline-none admin-dark:bg-[#132a4f] admin-dark:text-white">
                        <option value="bn">ক খ গ ঘ</option>
                        <option value="en">A B C D</option>
                      </select>
                    </label>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button onClick={handlePreviewPdf} disabled={generating} className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#0b1e3a] hover:bg-slate-50 disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white">Preview PDF</button>
                    <button onClick={handleGeneratePdf} disabled={generating} className="rounded-xl bg-[#0b1e3a] px-5 py-2 text-xs font-extrabold text-white shadow hover:bg-[#123060] disabled:opacity-40 admin-dark:bg-[#234e9f]">
                      {generating ? "Generating…" : "Generate PDF"}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow hover:bg-emerald-700 disabled:opacity-40">
                      {saving ? "Saving…" : editingId ? "Update Saved" : "Save Material"}
                    </button>
                  </div>
                </div>

                {/* Document header quick edit */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <input value={header.title} onChange={(e) => setHeader({ ...header, title: e.target.value })} placeholder="Title" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#234e9f] admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-white lg:col-span-2" />
                  <input value={header.subject} onChange={(e) => setHeader({ ...header, subject: e.target.value })} placeholder="Subject" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-white" />
                  <input value={header.chapter} onChange={(e) => setHeader({ ...header, chapter: e.target.value })} placeholder="Chapter" className="bangla rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-white" />
                  <input value={header.batch} onChange={(e) => setHeader({ ...header, batch: e.target.value })} placeholder="Batch" className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none admin-dark:border-[#1e3a65] admin-dark:bg-[#112544] admin-dark:text-white" />
                </div>

                {/* A4 Pages */}
                <div ref={previewRef} className="mt-6 flex flex-col items-center gap-8 bg-[#525659] p-4 py-6 sm:rounded-2xl sm:p-8">
                  {pages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="a4-page relative flex w-full max-w-[794px] flex-col bg-white shadow-[0_8px_40px_rgba(0,0,0,.25)]"
                      style={{
                        width: "210mm",
                        minHeight: "297mm",
                        padding: "12mm 14mm 10mm 14mm",
                        fontFamily: "'Hind Siliguri','Noto Sans Bengali',sans-serif",
                      }}
                    >
                      {/* Page header */}
                      {header.headerEnabled && (header.title || header.subject || header.chapter || header.batch || header.institution) && (
                        <div className="border-b-2 border-[#0b1e3a] pb-3">
                          {header.title && <h1 className="bangla text-center text-[15px] font-extrabold leading-tight text-[#0b1e3a]">{header.title}</h1>}
                          <div className="bangla mt-1 flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-[10px] leading-tight text-slate-600">
                            {header.subject && <span>Subject: <b className="text-slate-800">{header.subject}</b></span>}
                            {header.chapter && <span>Chapter: <b className="text-slate-800">{header.chapter}</b></span>}
                            {header.batch && <span>Batch: <b className="text-slate-800">{header.batch}</b></span>}
                            {header.institution && <span>{header.institution}</span>}
                          </div>
                        </div>
                      )}

                      {/* Questions */}
                      <div className="mt-4 flex-1">
                        {page.questions.length === 0 ? (
                          <p className="py-10 text-center text-sm text-slate-400">No questions on this page</p>
                        ) : (
                          <div className="space-y-4">
                            {page.questions.map((q) => (
                              <div
                                key={q.id}
                                className="group/q break-inside-avoid rounded-lg p-1 transition hover:bg-amber-50/60"
                                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                              >
                                <p
                                  className="bangla cursor-text text-[11.5px] font-bold leading-[1.6] text-[#0f172a] outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-amber-300"
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const txt = (e.currentTarget.textContent || "").replace(/^\s*\d+\.\s*/, "").trim();
                                    if (txt !== q.question) handleUpdate(q.id, { question: txt });
                                  }}
                                  title="Click to edit question (bold in PDF)"
                                >
                                  <span className="mr-1">{q.qNumber}.</span>
                                  {q.question || <span className="text-red-400">[Empty question — click to edit]</span>}
                                </p>
                                <div className="bangla mt-1.5 grid gap-1 pl-5 text-[11px] leading-[1.6] text-slate-800">
                                  {(["A", "B", "C", "D"] as const).map((ltr, idx) => (
                                    <div key={ltr} className="flex gap-2">
                                      <span className="shrink-0 font-semibold">{ltr}.</span>
                                      <span
                                        className="flex-1 cursor-text font-normal outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-amber-300"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => {
                                          const txt = (e.currentTarget.textContent || "").trim();
                                          if (txt !== q.options[idx]) {
                                            const next = [...q.options] as [string, string, string, string];
                                            next[idx] = txt;
                                            handleUpdate(q.id, { options: next });
                                          }
                                        }}
                                        title={`Click to edit Option ${ltr}`}
                                      >
                                        {q.options[idx] || <span className="text-red-400">[Empty — click to edit]</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Answer Key */}
                      <div className="mt-auto pt-6">
                        <div className="rounded-lg border border-[#0f172a] bg-white">
                          <div className="border-b border-[#0f172a] bg-[#f8fafc] px-3 py-1.5 text-center">
                            <span className="bangla text-[11px] font-extrabold tracking-wide text-[#0b1e3a]">উত্তরমালা</span>
                            <span className="ml-2 text-[10px] font-semibold text-slate-500">Answer Key — Page {page.pageNumber} (Q{page.startQ}–Q{page.endQ})</span>
                          </div>
                          {page.questions.length === 0 ? (
                            <div className="px-3 py-2 text-center text-xs text-slate-400">No answers</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-center text-[11px]">
                                <thead>
                                  <tr className="bg-[#f1f5f9]">
                                    {page.questions.map((q) => (
                                      <th key={`h-${q.id}`} className="border border-slate-300 px-1 py-1 font-semibold text-slate-700">
                                        {q.qNumber}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    {page.questions.map((q) => {
                                      const raw = q.answer?.trim() ?? "";
                                      let disp = "—";
                                      if (raw) {
                                        if (answerLang === "bn") {
                                          const map: Record<string, string> = { A: "ক", B: "খ", C: "গ", D: "ঘ", a: "ক", b: "খ", c: "গ", d: "ঘ" };
                                          disp = map[raw] ?? (["ক", "খ", "গ", "ঘ"].includes(raw) ? raw : raw);
                                        } else {
                                          const map: Record<string, string> = { ক: "A", খ: "B", গ: "C", ঘ: "D" };
                                          disp = map[raw] ?? raw.toUpperCase();
                                        }
                                      }
                                      const isEmpty = !raw;
                                      return (
                                        <td key={`a-${q.id}`} className={`border border-slate-300 px-1 py-1 font-normal ${isEmpty ? "bg-amber-50 text-amber-700" : "text-slate-800"}`}>
                                          <input
                                            value={q.answer}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            placeholder="—"
                                            className="w-full bg-transparent text-center outline-none placeholder:text-slate-300"
                                            style={{ minWidth: 24 }}
                                          />
                                          <span className="hidden">{disp}</span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      {header.showPageNumbers && (
                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-[9px] text-slate-500">
                          <span className="bangla">{header.institution || "MediSpark"}</span>
                          <span>Page {page.pageNumber} of {pages.length}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button onClick={handleGeneratePdf} disabled={generating} className="rounded-xl bg-[#0b1e3a] px-6 py-2.5 text-sm font-extrabold text-white shadow hover:bg-[#123060] disabled:opacity-40">Generate PDF</button>
                  <button onClick={handlePreviewPdf} className="rounded-xl border border-[#cbd5e1] bg-white px-6 py-2.5 text-sm font-bold text-[#0b1e3a] hover:bg-slate-50">Preview PDF</button>
                  <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">{editingId ? "Update & Save" : "Save Material"}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Saved Materials */}
        <div className="mt-8 rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">Saved Materials</h2>
            <button onClick={() => void loadSaved()} className="text-xs font-bold text-[#234e9f] hover:underline admin-dark:text-[#93c5fd]">Refresh</button>
          </div>
          {savedMaterials.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-6 text-center text-xs text-slate-500 admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-[#8da0c0]">No saved materials yet. Generate and save your first material — it will remain editable anytime.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedMaterials.map((m) => (
                <div key={m.id} className="group rounded-2xl border border-[#dbeafe] bg-[#f8fafc] p-4 transition hover:border-[#93c5fd] hover:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:hover:bg-[#132a4f]">
                  <h3 className="bangla line-clamp-2 text-sm font-extrabold leading-snug text-[#0b1e3a] admin-dark:text-white">{m.payload.header.title || m.title}</h3>
                  <p className="bangla mt-1 line-clamp-1 text-xs text-slate-500 admin-dark:text-[#8da0c0]">
                    {m.payload.header.subject && `${m.payload.header.subject} • `}
                    {m.payload.questions.length} Qs • {new Date(m.updatedAt).toLocaleDateString("en-GB")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleLoadMaterial(m)} className="flex-1 rounded-xl bg-[#0b1e3a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#123060] admin-dark:bg-[#234e9f]">Edit</button>
                    <button onClick={() => void handleDeleteSaved(m.id)} className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 admin-dark:text-[#8da0c0]">MediSpark Material PDF Generator • A4 • Bangla + English • Print-ready • 100% client-side PDF (no data leaves browser until you Save)</p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-xl admin-dark:bg-white admin-dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
