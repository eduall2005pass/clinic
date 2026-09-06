"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { parsePastedMcqs } from "@/lib/paste-mcq-parser";
import type { PdfMaterialQuestion } from "@/lib/pdf-materials";
import {
  paginateQuestions,
  type PaginatedPage,
  type LineSpacing,
  lineSpacingFactor,
} from "@/components/admin/MaterialPdf/pagination";

type Step = "paste" | "preview";

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
  const { authLoading } = useAuth();
  const [materialName, setMaterialName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [questions, setQuestions] = useState<PdfMaterialQuestion[]>([]);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>("normal");
  const [detection, setDetection] = useState<{ total: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Usable column height depends on lineSpacing? Keep fixed, pagination estimates handle spacing
  const usableColumnHeight = 740; // px per column after header + answer box reserved

  const pages: PaginatedPage[] = useMemo(() => {
    return paginateQuestions(questions, usableColumnHeight, lineSpacing, true);
  }, [questions, lineSpacing]);

  const handleDetect = () => {
    if (!pasteText.trim()) {
      setToast("Please paste questions first.");
      return;
    }
    const parsed = parsePastedMcqs(pasteText);
    if (parsed.length === 0) {
      setToast("No MCQs detected. Check format.");
      return;
    }
    const mapped = mapParserToQuestions(parsed);
    const sanitized = sanitizeQuestions(mapped);
    setQuestions(sanitized);
    setDetection({ total: sanitized.length });
    setToast(`${sanitized.length} questions detected & formatted (1..${sanitized.length})`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = (id: string, patch: Partial<PdfMaterialQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const handleDelete = (id: string) => {
    setQuestions((prev) => sanitizeQuestions(prev.filter((q) => q.id !== id)));
  };

  const handleAnswerChange = (id: string, val: string) => {
    let v = val.trim().toUpperCase();
    // Map Bangla to English for storage
    const bnToEn: Record<string, string> = { ক: "A", খ: "B", গ: "C", ঘ: "D" };
    if (bnToEn[val.trim()]) v = bnToEn[val.trim()];
    const allowed = ["A", "B", "C", "D", ""];
    const final = allowed.includes(v) ? v : "";
    handleUpdate(id, { answer: final });
  };

  const handleGeneratePdf = async () => {
    if (questions.length === 0) {
      setToast("No questions to generate.");
      return;
    }
    if (!previewRef.current) {
      setToast("Preview not ready");
      return;
    }
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      // Ensure Bangla fonts loaded
      // @ts-ignore
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 300));

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageEls = previewRef.current.querySelectorAll<HTMLElement>(".a4-page");
      if (!pageEls || pageEls.length === 0) throw new Error("Preview not ready");
      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDoc) => {
            // Force font ensure in clone
            const style = clonedDoc.createElement("style");
            style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap');`;
            clonedDoc.head.appendChild(style);
          },
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      const fileName =
        (materialName || "MediSpark-Material").replace(/[^a-zA-Z0-9\u0980-\u09FF\-_ ]/g, "").trim().slice(0, 60) ||
        "MediSpark-Material";
      pdf.save(`${fileName}.pdf`);
      setToast("PDF downloaded");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setQuestions([]);
    setPasteText("");
    setDetection(null);
    setToast("Cleared");
  };

  if (authLoading) return <AccessLoading label="Loading Material PDF Generator…" />;

  const spacingLabel = typeof lineSpacing === "string" ? lineSpacing : `${lineSpacing}`;
  const lineHeightStyle = lineSpacingFactor(lineSpacing);

  return (
    <div className="min-h-screen bg-[#f1f5f9] admin-dark:bg-[#0a162e]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap'); .bangla{font-family:'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif} .a4-page *{font-family:'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif}`}</style>

      <div className="mx-auto max-w-[1280px] px-3 py-6 sm:px-6 sm:py-8">
        {/* Top Title */}
        <div className="rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#234e9f] admin-dark:text-[#93c5fd]">
            Admin Tool • Materials PDF Generator
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-[#0b1e3a] sm:text-2xl admin-dark:text-white">
            Materials PDF Generator
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm admin-dark:text-[#8da0c0]">
            Material Name → Paste MCQs → Detect & Format → Editable A4 Preview → Generate PDF → Download. Two-column A4, never-split MCQ blocks, page-specific উত্তরমালা.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-600 admin-dark:text-[#8da0c0]">
              {questions.length} Questions • {pages.length} Page{pages.length !== 1 ? "s" : ""} • A4 Two-Column
            </span>
            {detection && (
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white admin-dark:bg-white admin-dark:text-slate-900">
                {detection.total} Detected
              </span>
            )}
          </div>
        </div>

        {/* 1. Material Name */}
        <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <label className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">1. Material Name</label>
          <p className="mt-1 text-xs text-slate-500 admin-dark:text-[#8da0c0]">
            This name will appear in the PDF title area (centered below header) if provided.
          </p>
          <input
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            placeholder="e.g. Biology - Cell - Model Test 01"
            className="bangla mt-3 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#234e9f] focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white"
          />
        </div>

        {/* 2. Paste MCQs + 3. Detect & Format */}
        <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
          <label className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">2. Paste MCQs</label>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 admin-dark:text-[#8da0c0]">
            Paste 10 / 20 / 50 / 100+ MCQs at once. Any numbering (25, 31, 47…) will be auto-renumbered to 1,2,3… Bangla + English mixed, Unicode fully supported.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste your questions

Example:
25. Which is the powerhouse of the cell?
A. Nucleus
B. Mitochondria
C. Ribosome
D. Golgi body
Answer: B

31. মানবদেহে লোহিত রক্তকণিকার আয়ুষ্কাল কত দিন?
A. 60 দিন
B. 90 দিন
C. 120 দিন
D. 150 দিন
উত্তর: গ

...`}
            className="bangla mt-3 min-h-[280px] w-full resize-y rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#234e9f] focus:bg-white admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e] admin-dark:text-white"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleDetect}
              disabled={!pasteText.trim()}
              className="rounded-xl bg-[#0b1e3a] px-6 py-2.5 text-sm font-extrabold text-white shadow hover:bg-[#123060] disabled:opacity-40 admin-dark:bg-[#234e9f]"
            >
              Detect & Format
            </button>
            <button
              onClick={handleClear}
              className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white"
            >
              Clear
            </button>
            <span className="ml-auto self-center text-xs text-slate-400">
              {pasteText.length} chars • Auto renumber 1..N • Detects Ans: / উত্তর: / Correct Answer:
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Supported answers: <code className="rounded bg-slate-100 px-1">Answer: B</code> <code className="rounded bg-slate-100 px-1">Ans: B</code>{" "}
            <code className="rounded bg-slate-100 px-1">Correct Answer: (B)</code> <code className="rounded bg-slate-100 px-1">Ans. B</code>{" "}
            <code className="rounded bg-slate-100 px-1">উত্তর: খ</code> <code className="rounded bg-slate-100 px-1">উত্তর: গ</code> — if missing, answer stays blank and you can set manually in preview.
          </p>
        </div>

        {/* 5. Editable A4 Preview */}
        {questions.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[#dbeafe] bg-white p-4 sm:p-6 shadow-sm admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#0b1e3a] admin-dark:text-white">Editable A4 Preview</h2>
                <p className="mt-1 text-xs text-slate-500 admin-dark:text-[#8da0c0]">
                  Real-time A4 preview = exact PDF layout. Click any question/option to edit. Changing text updates pagination instantly. Page-specific উত্তরমালা at bottom of every page.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleClear}
                  className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* 11. Editable Line Spacing — ONLY control */}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#dbeafe] bg-[#f8fafc] p-3 admin-dark:border-[#1e3a65] admin-dark:bg-[#0a162e]">
              <span className="text-xs font-extrabold text-[#0b1e3a] admin-dark:text-white">Line Spacing</span>
              <div className="flex gap-1.5">
                {(["compact", "normal", "relaxed"] as LineSpacing[]).map((opt) => (
                  <button
                    key={opt as string}
                    onClick={() => setLineSpacing(opt)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      lineSpacing === opt
                        ? "bg-[#0b1e3a] text-white shadow admin-dark:bg-[#234e9f]"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-[#cbd5e1] admin-dark:bg-[#112544] admin-dark:text-[#8da0c0] admin-dark:border-[#1e3a65]"
                    }`}
                  >
                    {opt === "compact" ? "Compact" : opt === "normal" ? "Normal" : "Relaxed"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 admin-dark:text-[#8da0c0]">— only spacing control • updates pagination automatically</span>
              <span className="ml-auto text-xs text-slate-400 hidden sm:inline">{spacingLabel} • {lineHeightStyle.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {/* A4 Pages Preview */}
        {questions.length > 0 ? (
          <div
            ref={previewRef}
            className="mt-6 flex flex-col items-center gap-8 bg-[#525659] p-4 py-6 sm:rounded-2xl sm:p-8"
            style={{ background: "#525659" }}
          >
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className="a4-page relative flex w-full max-w-[794px] flex-col bg-white shadow-[0_8px_40px_rgba(0,0,0,.35)]"
                style={{
                  width: "210mm",
                  minHeight: "297mm",
                  padding: "10mm 12mm 10mm 12mm",
                  fontFamily: "'Hind Siliguri','Noto Sans Bengali',sans-serif",
                }}
              >
                {/* 6. Top Header — fixed every page */}
                <div className="flex items-center gap-2 text-[9px] font-semibold tracking-wide text-slate-700">
                  <span className="shrink-0 font-bold text-[#0b1e3a]">MediSpark Academic and Admission Care</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 opacity-70" style={{ borderBottomStyle: "dotted", height: 1, marginTop: 6 }} />
                  <span className="shrink-0 font-bold text-[#0b1e3a]">Page {String(page.pageNumber).padStart(2, "0")}</span>
                </div>
                <div className="mt-1 border-b border-dotted border-slate-300" style={{ borderBottomStyle: "dotted" }} />

                {/* Material Name Title if exists */}
                {materialName.trim() && (
                  <div className="mt-3 text-center">
                    <h2 className="bangla text-[13px] font-extrabold leading-tight text-[#0b1e3a]">{materialName.trim()}</h2>
                  </div>
                )}

                {/* 7. Two-Column Page Layout with vertical center line */}
                <div
                  className="relative mt-3 flex-1"
                  style={{
                    columnCount: 2,
                    columnGap: "18px",
                    columnRule: "1px solid #1e293b",
                    orphans: 1,
                    widows: 1,
                  } as React.CSSProperties}
                >
                  {/* Center vertical line fallback absolute for PDF fidelity */}
                  {/* Questions */}
                  {page.questions.map((q) => (
                    <div
                      key={q.id}
                      className="mb-3 break-inside-avoid rounded-[2px] p-1"
                      style={{ breakInside: "avoid", pageBreakInside: "avoid", WebkitColumnBreakInside: "avoid" } as React.CSSProperties}
                    >
                      {/* Question text Bold — number editable */}
                      <div className="flex gap-1.5">
                        <span className="flex shrink-0 items-start gap-1">
                          <input
                            type="number"
                            value={q.qNumber}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (Number.isFinite(n) && n > 0) handleUpdate(q.id, { qNumber: n });
                            }}
                            className="pdf-number-input w-8 rounded border border-transparent bg-transparent text-center text-[11px] font-bold text-[#0f172a] outline-none hover:border-[#cbd5e1] focus:border-[#234e9f] focus:bg-white"
                            style={{ lineHeight: "1" }}
                            title="Edit question number"
                          />
                          <span className="text-[11px] font-bold text-[#0f172a]">.</span>
                        </span>
                        <span
                          className="bangla flex-1 cursor-text text-[11px] font-bold leading-[1.7] text-[#0f172a] outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-amber-300 rounded px-0.5"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const txt = (e.currentTarget.textContent || "").trim();
                            if (txt !== q.question) handleUpdate(q.id, { question: txt });
                          }}
                          title="Click to edit question (bold in PDF)"
                          style={{ lineHeight: `${lineHeightStyle * 1.1}` }}
                        >
                          {q.question || <span className="text-red-400 font-normal">[Empty — click to edit]</span>}
                        </span>
                        <button
                          onClick={() => handleDelete(q.id)}
                          title="Delete question"
                          className="shrink-0 rounded border border-red-200 px-1 py-0.5 text-[9px] font-bold text-red-600 hover:bg-red-50 pdf-hide"
                          data-html2canvas-ignore="true"
                          style={{ height: 18 }}
                        >
                          ×
                        </button>
                      </div>
                      {/* Options Regular */}
                      <div className="bangla mt-1 grid gap-0.5 pl-5 text-[11px] font-normal leading-[1.6] text-[#1e293b]">
                        {(["A", "B", "C", "D"] as const).map((ltr, idx) => (
                          <div key={ltr} className="flex gap-1.5">
                            <span className="shrink-0 font-semibold">{ltr}.</span>
                            <span
                              className="flex-1 cursor-text font-normal outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-amber-300 rounded px-0.5"
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
                              style={{ lineHeight: `${lineHeightStyle}` }}
                            >
                              {q.options[idx] || <span className="text-red-400">[Empty]</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Correct Answer inline editor — hidden in PDF, only for editing */}
                      <div className="mt-1 flex items-center gap-1.5 pl-5 pdf-hide" data-html2canvas-ignore="true">
                        <span className="text-[9px] font-bold text-slate-500">Ans:</span>
                        <select
                          value={q.answer}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="rounded border border-[#cbd5e1] bg-white px-1 py-0.5 text-[11px] font-bold text-[#0b1e3a] outline-none focus:border-[#234e9f]"
                          style={{ minWidth: 44 }}
                        >
                          <option value="">—</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                        <span className="text-[9px] text-slate-400">editable — updates Answer Box</span>
                      </div>
                    </div>
                  ))}
                  {page.questions.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400 col-span-2">No questions</p>
                  )}
                </div>

                {/* 12. Answer Box — bottom of every page, bordered */}
                <div className="mt-auto pt-4">
                  <div className="rounded-[6px] border border-[#0f172a] bg-white overflow-hidden">
                    <div className="border-b border-[#0f172a] bg-[#f8fafc] py-1 text-center">
                      <span className="bangla text-[11px] font-extrabold tracking-wide text-[#0b1e3a]">উত্তরমালা</span>
                    </div>
                    {page.questions.length === 0 ? (
                      <div className="px-3 py-2 text-center text-xs text-slate-400">—</div>
                    ) : (
                      <div className="p-2">
                        {/* Two horizontal rows — spec exact: row1 numbers, row2 answers */}
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-center">
                          {page.questions.map((q) => (
                            <span key={`num-${q.id}`} className="min-w-[24px] text-[11px] font-normal text-slate-700">
                              {String(q.qNumber).padStart(2, "0")}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center border-t border-dashed border-slate-200 pt-1">
                          {page.questions.map((q) => (
                            <span key={`ans-${q.id}`} className="min-w-[24px] text-[11px] font-normal text-slate-900">
                              {q.answer?.trim() ? q.answer.trim().toUpperCase() : "—"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center admin-dark:border-[#1e3a65] admin-dark:bg-[#112544]">
            <p className="text-sm font-bold text-slate-600 admin-dark:text-[#8da0c0]">No preview yet</p>
            <p className="mt-1 text-xs text-slate-400">Paste MCQs above and click Detect & Format to see editable A4 preview</p>
          </div>
        )}

        {/* 16. Generate PDF + 17. Download */}
        {questions.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleGeneratePdf}
              disabled={generating}
              className="rounded-xl bg-[#0b1e3a] px-8 py-3 text-sm font-extrabold text-white shadow hover:bg-[#123060] disabled:opacity-40 admin-dark:bg-[#234e9f]"
            >
              {generating ? "Generating…" : "Generate PDF"}
            </button>
            <button
              onClick={handleGeneratePdf}
              disabled={generating}
              className="rounded-xl border border-[#cbd5e1] bg-white px-6 py-3 text-sm font-bold text-[#0b1e3a] hover:bg-slate-50 disabled:opacity-40 admin-dark:border-[#1e3a65] admin-dark:bg-[#0f2547] admin-dark:text-white"
            >
              Download PDF
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400 admin-dark:text-[#8da0c0]">
          MediSpark Material PDF Generator • Focused tool: Material Name → Paste → Detect & Format → Edit → Generate → Download • Two-column A4 • Professional print-ready
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-xl admin-dark:bg-white admin-dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
