import type { PdfMaterialQuestion } from "@/lib/pdf-materials";

// A4 dimensions: 210mm x 297mm = 794 x 1123 px @ 96dpi
// Margins: 14mm left/right, 12mm top/bottom => content width 682px, height 998px
// Header: ~72px if enabled, Footer/pageNum: 28px, AnswerKey box: 78-95px reserved
// Usable height for questions ~ 820px
export const A4_CONTENT_WIDTH_PX = 682;
export const A4_USABLE_HEIGHT_PX = 820; // dynamic via header

export function estimateQuestionHeight(q: PdfMaterialQuestion): number {
  const charsPerLineQ = 78;
  const charsPerLineOpt = 74;
  const linesQ = Math.max(1, Math.ceil((q.question || "").length / charsPerLineQ));
  const qHeight = linesQ * 21 + 10; // bold question with spacing
  let optsHeight = 0;
  for (const opt of q.options) {
    const len = (opt || "").length;
    const lines = Math.max(1, Math.ceil(Math.max(len, 1) / charsPerLineOpt));
    optsHeight += lines * 19 + 4;
  }
  // spacing between question and options + bottom margin
  return qHeight + optsHeight + 22;
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
): PaginatedPage[] {
  if (questions.length === 0) return [{ pageNumber: 1, questions: [], startQ: 1, endQ: 0 }];
  const pages: PaginatedPage[] = [];
  let current: PdfMaterialQuestion[] = [];
  let curH = 0;
  for (const q of questions) {
    const h = estimateQuestionHeight(q);
    // If single question taller than usable, still put alone on page
    if (curH + h > usableHeight && current.length > 0) {
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
