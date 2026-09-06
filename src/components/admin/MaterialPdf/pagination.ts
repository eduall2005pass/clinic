import type { PdfMaterialQuestion } from "@/lib/pdf-materials";

// A4 dimensions: 210mm x 297mm = 794 x 1123 px @ 96dpi
// Margins: 14mm left/right, 12mm top/bottom => content width 682px, height 998px
// Header: ~72px if enabled, Footer/pageNum: 28px, AnswerKey box: 78-95px reserved
// Usable height for questions ~ 820px
export const A4_CONTENT_WIDTH_PX = 682;
export const A4_USABLE_HEIGHT_PX = 820; // dynamic via header

export type LineSpacing = "compact" | "normal" | "relaxed" | number;
export function lineSpacingFactor(v: LineSpacing): number {
  if (typeof v === "number") return v;
  switch (v) {
    case "compact":
      return 1.0;
    case "normal":
      return 1.35;
    case "relaxed":
      return 1.7;
    default:
      return 1.35;
  }
}

function estimateImageHeight(q: PdfMaterialQuestion): number {
  if (!q.image?.dataUrl) return 0;
  // Standalone image block: no question/options, only image
  const w = q.image.widthPercent ?? 100;
  // Estimate height: base on width percent, preserve aspect ~4:3 typical diagram
  // 100% ~ 160px, 70% ~ 120px, 50% ~ 90px, 30% ~ 60px in column width
  const base = 160;
  const h = Math.round((base * w) / 100);
  // Add padding/margin around image
  return h + 12;
}

export function estimateQuestionHeight(q: PdfMaterialQuestion, spacing: LineSpacing = "normal"): number {
  const factor = lineSpacingFactor(spacing);
  // Standalone image block: only image height
  if (q.isStandaloneImage) {
    return estimateImageHeight(q) + 8;
  }
  // In two-column layout, width is half (~325px), so chars per line is ~38-42
  const charsPerLineQ = 42;
  const charsPerLineOpt = 38;
  const linesQ = Math.max(1, Math.ceil((q.question || "").length / charsPerLineQ));
  const qHeight = linesQ * (18 * factor) + 10;
  let optsHeight = 0;
  for (const opt of q.options) {
    const len = (opt || "").length;
    const lines = Math.max(1, Math.ceil(Math.max(len, 1) / charsPerLineOpt));
    optsHeight += lines * (16 * factor) + 4;
  }
  const imgH = estimateImageHeight(q);
  return qHeight + optsHeight + imgH + 14 * factor + 12;
}

export type PaginatedPage = {
  pageNumber: number;
  questions: PdfMaterialQuestion[];
  startQ: number;
  endQ: number;
};

export function paginateQuestions(
  questions: PdfMaterialQuestion[],
  usableHeight: number = A4_USABLE_HEIGHT_PX,
  spacing: LineSpacing = "normal",
  twoColumn: boolean = true,
): PaginatedPage[] {
  if (questions.length === 0) return [{ pageNumber: 1, questions: [], startQ: 1, endQ: 0 }];
  // Two-column: page holds 2 * columnHeight. When twoColumn true, usableHeight is column height,
  // so effective page capacity = usableHeight * 2
  const pageCapacity = twoColumn ? usableHeight * 2 : usableHeight;
  const pages: PaginatedPage[] = [];
  let current: PdfMaterialQuestion[] = [];
  let curH = 0;
  for (const q of questions) {
    const h = estimateQuestionHeight(q, spacing);
    // Never split: if overflow, move entire block to next page/column
    if (curH + h > pageCapacity && current.length > 0) {
      const start = pages.reduce((acc, p) => acc + p.questions.length, 0) + 1;
      pages.push({
        pageNumber: pages.length + 1,
        questions: current,
        startQ: start,
        endQ: start + current.length - 1,
      });
      current = [q];
      curH = h;
    } else {
      current.push(q);
      curH += h;
    }
    // If single question taller than pageCapacity, still keep alone (will overflow gracefully)
    if (h > pageCapacity && current.length === 1) {
      // already handled, will be pushed next iter
    }
  }
  if (current.length > 0) {
    const start = pages.reduce((acc, p) => acc + p.questions.length, 0) + 1;
    pages.push({
      pageNumber: pages.length + 1,
      questions: current,
      startQ: start,
      endQ: start + current.length - 1,
    });
  }
  return pages;
}

export const ANSWER_LABELS = {
  en: ["A", "B", "C", "D"] as const,
  bn: ["ক", "খ", "গ", "ঘ"] as const,
};

export function normalizeAnswer(ans: string): string {
  const t = ans.trim();
  if (["A", "B", "C", "D", "a", "b", "c", "d"].includes(t)) return t.toUpperCase();
  if (["ক", "খ", "গ", "ঘ"].includes(t)) return t;
  // also accept 1-4
  if (["1", "2", "3", "4"].includes(t)) return String.fromCharCode(64 + Number(t));
  return t;
}

export function answerToDisplay(ans: string, preferBn: boolean): string {
  if (!ans) return "—";
  const up = ans.toUpperCase();
  if (["A", "B", "C", "D"].includes(up)) {
    if (preferBn) {
      const map: Record<string, string> = { A: "ক", B: "খ", C: "গ", D: "ঘ" };
      return map[up] ?? up;
    }
    return up;
  }
  if (["ক", "খ", "গ", "ঘ"].includes(ans)) {
    if (!preferBn) {
      const map: Record<string, string> = { ক: "A", খ: "B", গ: "C", ঘ: "D" };
      return map[ans] ?? ans;
    }
    return ans;
  }
  return ans;
}
