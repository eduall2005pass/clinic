// Paste MCQ Parser — intelligent bulk MCQ detection
// Requirements: detect boundaries even when numbering inconsistent/missing, blank lines,
// options A/B/C/D or a/b/c/d, different spacing. Extract Q text, A-D, Correct Answer.
// Ignore original numbering; mapping to Q01..QNN is done by caller.

export type ParsedPasteMcq = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number | null;
  rawBlock: string;
  issues: string[];
  needsReview: boolean;
  confidence: number;
  originalNumber?: string | null;
};

function stripNumbering(text: string): string {
  // Remove leading numbering like "5.", "5)", "Q5.", "Q 5:", "Question 5.", "01.", etc.
  return text
    .replace(/^\s*(?:Q\s*|Question\s*)?\d{1,3}\s*[.)\-:]\s*/i, "")
    .trim();
}

function parseOptionLine(line: string, allowNumeric = false): { index: number; text: string; isCorrectMarker: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Pattern: letter A-D with various wrappers and separators, possibly with correct marker at end
  // Supports: A. text, A) text, A: text, A - text, (A) text, [A] text, A . text
  let m = trimmed.match(/^\s*(?:[\(\[]\s*)?([A-Da-d])(?:\s*[\)\]])?\s*[.)\-:]\s*(.+)$/);
  if (m) {
    const letter = m[1].toUpperCase();
    const idx = letter.charCodeAt(0) - 65;
    let content = m[2].trim();
    let isCorrect = false;
    if (/\*\s*$/.test(content) || /\(correct\)\s*$/i.test(content) || /✓\s*$/.test(content) || /✔\s*$/.test(content)) {
      isCorrect = true;
      content = content.replace(/\s*\*\s*$/, "").replace(/\s*\(correct\)\s*$/i, "").replace(/\s*✓\s*$/, "").replace(/\s*✔\s*$/, "").trim();
    }
    // Also handle "(correct)" without marker removal edge: check again
    return { index: idx, text: content, isCorrectMarker: isCorrect };
  }
  // Numeric options 1-4 → map to A-D — only when explicitly allowed (inside option section)
  if (!allowNumeric) return null;
  m = trimmed.match(/^\s*([1-4])\s*[.)\-:]\s*(.+)$/);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    let content = m[2].trim();
    let isCorrect = false;
    if (/\*\s*$/.test(content) || /\(correct\)\s*$/i.test(content)) {
      isCorrect = true;
      content = content.replace(/\s*\*\s*$/, "").replace(/\s*\(correct\)\s*$/i, "").trim();
    }
    // Heuristic: numeric options inside question numbered block would be ambiguous;
    // but we treat them as options only when we are inside option section. Caller decides.
    return { index: idx, text: content, isCorrectMarker: isCorrect };
  }
  return null;
}

function parseAnswerLine(line: string): { index: number } | null {
  const trimmed = line.trim();
  // Bangla answer patterns: উত্তর: খ , উত্তর - ক , উত্তরঃ গ , সঠিক উত্তর: ঘ , Ans: ক etc.
  // Must map ক->0, খ->1, গ->2, ঘ->3
  const bnMap: Record<string, number> = { ক: 0, খ: 1, গ: 2, ঘ: 3 };
  // Try Bangla first — avoid \b after Bangla chars (word boundary fails for Unicode)
  let mBn = trimmed.match(
    /^\s*(?:উত্তর(?:মালা)?|সঠিক\s*উত্তর|Ans(?:wer)?\.?|Correct\s*Answer|Correct|Key|Solution|Answer\s*Key)\s*(?:is)?\s*[:\-ঃ.]?\s*[\(]?\s*([A-Da-dকখগঘ1-4])\s*[\)]?(?:\s|$)/i,
  );
  // Broader Bangla: "উত্তর: খ" anywhere at line start, also handle "উঃ খ" variant
  if (!mBn) {
    mBn = trimmed.match(/^\s*উ(?:ত্তর)?\s*[:\-ঃ.]?\s*[\(]?\s*([কখগঘ])\s*[\)]?(?:\s|$)/);
  }
  if (mBn) {
    const raw = mBn[1];
    if (bnMap[raw] !== undefined) return { index: bnMap[raw] };
    const up = raw.toUpperCase();
    if (/[A-D]/.test(up)) return { index: up.charCodeAt(0) - 65 };
    if (/[1-4]/.test(raw)) return { index: parseInt(raw, 10) - 1 };
  }
  // English patterns (fallback, more permissive with . and () )
  let m = trimmed.match(
    /^\s*(?:Ans(?:wer)?\.?|Correct\s*Answer|Correct|Key|Solution|Answer\s*Key)\s*(?:is)?\s*[:\-.]?\s*[\(]?\s*([A-Da-dকখগঘ1-4])\s*[\)]?(?:\s|$)/i,
  );
  if (m) {
    const raw = m[1];
    if (bnMap[raw] !== undefined) return { index: bnMap[raw] };
    const up = raw.toUpperCase();
    if (/[1-4]/.test(up)) return { index: parseInt(up, 10) - 1 };
    if (/[A-D]/.test(up)) return { index: up.charCodeAt(0) - 65 };
  }
  return null;
}

function isNumberedQuestionStart(line: string): boolean {
  // Detect lines that start with numbering that likely indicates a new question
  // e.g., "1. ", "1) ", "5. Question", "Q1. ", "Question 1:", "01. "
  return /^\s*(?:Q\s*|Question\s*)?\d{1,3}\s*[.)\-:]\s+.+/.test(line);
}

// Split text into raw blocks using numbered markers when available
function splitByNumbering(text: string): string[] | null {
  const normalized = text.replace(/\r\n/g, "\n");
  // Find all numbered starts: need to capture position
  // Use regex with global and capture start index
  const regex = /(?:^|\n)\s*((?:Q\s*|Question\s*)?\d{1,3}\s*[.)\-:]\s+)/gi;
  const matches: { index: number; length: number }[] = [];
  let m: RegExpExecArray | null;
  // We use a separate pass to find markers that are likely questions, not options (options are A-D, not numeric only)
  // So numeric markers here are question numbers
  while ((m = regex.exec(normalized)) !== null) {
    // m[0] includes leading \n if any; m[1] is the marker itself
    // Calculate start index of the line (where the number starts)
    const full = m[0];
    const marker = m[1];
    const markerStart = m.index + full.length - marker.length;
    // Heuristic: if the line after marker contains option-like pattern very short (<3 chars), it might be false
    // But question text should be at least a few words, so we accept
    // Also ignore if marker is like "1. " but next content is a single letter? Not needed.
    matches.push({ index: markerStart, length: full.length });
  }
  if (matches.length < 2) return null; // not enough markers to reliably split; fallback to line parser
  // Sort by index (regex exec already ordered)
  const blocks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    const block = normalized.slice(start, end).trim();
    if (block) blocks.push(block);
  }
  // Validate: at least some blocks contain option-like lines, otherwise fallback
  const withOptions = blocks.filter((b) => {
    const lines = b.split("\n");
    return lines.some((l) => parseOptionLine(l) !== null);
  }).length;
  if (withOptions < Math.max(1, Math.floor(blocks.length * 0.5))) {
    // Less than half look like MCQs, probably false split
    return null;
  }
  return blocks;
}

function parseSingleBlock(blockText: string): ParsedPasteMcq {
  const rawBlock = blockText;
  const lines = blockText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  // We'll go line by line inside block
  let questionLines: string[] = [];
  const options: [string, string, string, string] = ["", "", "", ""];
  let correctIndex: number | null = null;
  let originalNumber: string | null = null;
  let seenOptions = false;
  let optionMarkerCorrectIdx: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ans = parseAnswerLine(line);

    // Check for answer line first (before option, to avoid misclassifying "Ans: A" as option if regex overlaps)
    if (ans) {
      correctIndex = ans.index;
      continue;
    }

    // If this looks like a numbered question start and we haven't seen options yet, treat as question, not option
    // This prevents "1. Question text" being mis-identified as numeric option "1."
    if (!seenOptions && isNumberedQuestionStart(line)) {
      // Will be handled as question below
    } else {
      // Only allow numeric 1-4 as options after we've already seen at least one letter option, or after options started
      const allowNumeric = seenOptions;
      const opt = parseOptionLine(line, allowNumeric);
      if (opt) {
        seenOptions = true;
      // If this is first option encountered, everything before is question
      // For first block, questionLines may already have content
      const idx = opt.index;
      if (options[idx] === "") {
        options[idx] = opt.text;
      } else {
        // Duplicate index — append as continuation? Or treat as new? For now append with space
        options[idx] = options[idx] + " " + opt.text;
      }
      if (opt.isCorrectMarker) {
        // If marker indicates correct, remember; answer line takes precedence later if both
        optionMarkerCorrectIdx = idx;
        if (correctIndex === null) correctIndex = idx;
      }
      continue;
      }
    }

    // Not option, not answer -> part of question text (unless it's after options, then could be stray answer explanation)
    if (!seenOptions) {
      // Before options, it's question
      if (questionLines.length === 0) {
        // First question line may contain numbering
        const mNum = line.match(/^\s*((?:Q\s*|Question\s*)?\d{1,3}\s*[.)\-:])\s*(.*)$/i);
        if (mNum) {
          originalNumber = mNum[1].trim();
          const rest = mNum[2].trim();
          if (rest) questionLines.push(rest);
          else {
            // Numbering line without text, next line will be question
            // Leave questionLines empty for now
          }
        } else {
          questionLines.push(line);
        }
      } else {
        questionLines.push(line);
      }
    } else {
      // After options started, non-option non-answer line could be:
      // - continuation of question? unlikely after options
      // - explanation/extra, ignore unless it's answer-like
      // We treat it as additional question line only if options not yet complete and line is long
      // Otherwise ignore. But for robustness, if we have not yet seen all 4 options, and line is not empty,
      // it might be a line-break within option text without label (multiline option)
      // We'll append to last option if that option exists and next line is not option?
      // Simpler: ignore stray lines after options unless they look like answer
      // If options partially filled and line looks like continuation, append to last filled option
      const lastIdx = options.findLastIndex ? options.findLastIndex((o) => o !== "") : (() => {
        for (let k = 3; k >= 0; k--) if (options[k] !== "") return k;
        return -1;
      })();
      // If this stray line is not option/answer and we have at least one option, treat as continuation of last option if options incomplete?
      // Heuristic: if line length > 3 and not question-like, append to last option
      // But to avoid polluting, only if line is short and seems like option continuation without label
      if (lastIdx >= 0 && lastIdx < 3 && options[lastIdx + 1] === "" && line.length < 120) {
        // Could be next option without label? Try to treat as next option sequentially
        // Only if we expect next index
        // Instead, push as next option in order
        const nextIdx = lastIdx + 1;
        if (options[nextIdx] === "") {
          // Assume this line is option text without label (e.g., line break)
          options[nextIdx] = line;
          continue;
        }
      }
      // Otherwise, if questionLines is short, maybe it's continuation?
      // We'll ignore stray after-options lines for now
    }
  }

  // If questionLines empty but blockText first line had numbering stripped, we already handled
  let question = questionLines.join(" ").replace(/\s+/g, " ").trim();
  // Fallback: if still empty, try to extract first non-option line as question
  if (!question) {
    const firstNonOption = lines.find((l) => !parseOptionLine(l) && !parseAnswerLine(l));
    if (firstNonOption) question = stripNumbering(firstNonOption);
  }

  // If correctIndex still null but option marker had it, use that
  if (correctIndex === null && optionMarkerCorrectIdx !== null) correctIndex = optionMarkerCorrectIdx;

  // Evaluate issues
  const issues: string[] = [];
  if (!question || question.length < 3) issues.push("Question text missing or too short");
  const filledCount = options.filter((o) => o.trim().length > 0).length;
  if (filledCount < 4) {
    const missing = options.map((o, i) => (!o.trim() ? String.fromCharCode(65 + i) : null)).filter(Boolean) as string[];
    if (missing.length) issues.push(`Missing option ${missing.join(", ")}`);
  }
  if (options.some((o, _i) => o.trim().length === 0)) {
    // already covered
  }
  if (filledCount < 2) issues.push("At least 2 options required");
  if (correctIndex === null) issues.push("Correct answer not found (add Ans: A/B/C/D)");
  else if (correctIndex < 0 || correctIndex >= 4 || !options[correctIndex]?.trim()) issues.push(`Correct answer ${String.fromCharCode(65 + (correctIndex ?? 0))} is empty`);

  const needsReview = issues.length > 0;
  const confidence = needsReview ? (filledCount >= 2 && question.length >= 3 ? 0.75 : 0.4) : 0.96;

  return {
    question,
    options,
    correctIndex,
    rawBlock,
    issues,
    needsReview,
    confidence,
    originalNumber,
  };
}

// Fallback line-parser for texts without consistent numbering
function parseViaLineScan(text: string): ParsedPasteMcq[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const rawLines = normalized.split("\n");
  // We'll iterate and create blocks using state machine described earlier
  type Block = { questionLines: string[]; options: [string, string, string, string]; correctIndex: number | null; rawLines: string[]; originalNumber: string | null };
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flushCurrent = () => {
    if (current && (current.questionLines.length > 0 || current.options.some((o) => o.trim()))) {
      blocks.push(current);
    }
    current = null;
  };

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const trimmed = line.trim();
    if (trimmed === "") {
      // blank delimiter: don't flush yet, but preserve as potential separator
      continue;
    }
    const opt = parseOptionLine(line);
    const ans = parseAnswerLine(line);
    const isQStart = isNumberedQuestionStart(line);

    if (ans) {
      if (!current) {
        // answer without question — ignore but create placeholder if needed?
        continue;
      }
      current.correctIndex = ans.index;
      current.rawLines.push(line);
      continue;
    }

    if (opt) {
      if (!current) {
        current = { questionLines: [], options: ["", "", "", ""], correctIndex: null, rawLines: [], originalNumber: null };
      }
      // If this option index already filled and we already have questionLines+some options, it suggests new question started missing its numbering
      // Example: after finishing D, next line is "A. ..." for next question but we didn't flush
      // Detect duplicate A when we already have A-D filled
      if (current.options[opt.index] !== "" && current.options.every((o) => o === "" ) === false) {
        // If we already have A filled and we see another A, and we have at least question + 2 options, flush and start new
        const hasQuestion = current.questionLines.length > 0;
        const filled = current.options.filter((o) => o.trim()).length;
        if (hasQuestion && filled >= 2) {
          flushCurrent();
          current = { questionLines: [], options: ["", "", "", ""], correctIndex: null, rawLines: [], originalNumber: null };
        }
      }
      // Handle correct marker
      if (opt.isCorrectMarker && current.correctIndex === null) {
        current.correctIndex = opt.index;
      }
      if (current.options[opt.index] === "") current.options[opt.index] = opt.text;
      else current.options[opt.index] += " " + opt.text;
      current.rawLines.push(line);
      continue;
    }

    if (isQStart) {
      // Numbered start — flush previous
      if (current && (current.questionLines.length > 0 || current.options.some((o) => o.trim()))) {
        flushCurrent();
      }
      const mNum = line.match(/^\s*((?:Q\s*|Question\s*)?\d{1,3}\s*[.)\-:])\s*(.*)$/i);
      let qText = line.trim();
      let orig: string | null = null;
      if (mNum) {
        orig = mNum[1].trim();
        qText = mNum[2].trim();
      } else {
        qText = stripNumbering(line);
      }
      current = { questionLines: qText ? [qText] : [], options: ["", "", "", ""], correctIndex: null, rawLines: [line], originalNumber: orig };
      // If qText empty (line was just "5." ), next non-option line will fill question
      continue;
    }

    // Plain text line (potential question text or continuation)
    if (!current) {
      current = { questionLines: [trimmed], options: ["", "", "", ""], correctIndex: null, rawLines: [line], originalNumber: null };
      continue;
    }
    // Current exists
    const hasAnyOption = current.options.some((o) => o !== "");
    if (!hasAnyOption) {
      // Still collecting question text (multiline question)
      current.questionLines.push(trimmed);
      current.rawLines.push(line);
    } else {
      // We have started options; a plain text line now likely starts a new question (without numbering)
      // Flush and start new question
      flushCurrent();
      current = { questionLines: [trimmed], options: ["", "", "", ""], correctIndex: null, rawLines: [line], originalNumber: null };
    }
  }
  flushCurrent();

  // Convert blocks to ParsedPasteMcq
  return blocks.map((b) => {
    const blockText = b.rawLines.join("\n");
    const question = b.questionLines.join(" ").replace(/\s+/g, " ").trim();
    const needs = (() => {
      const issues: string[] = [];
      if (!question || question.length < 3) issues.push("Question text missing or too short");
      const filled = b.options.filter((o) => o.trim()).length;
      if (filled < 4) {
        const missing = b.options.map((o, i) => (!o.trim() ? String.fromCharCode(65 + i) : null)).filter(Boolean) as string[];
        if (missing.length) issues.push(`Missing option ${missing.join(", ")}`);
      }
      if (filled < 2) issues.push("At least 2 options required");
      if (b.correctIndex === null) issues.push("Correct answer not found (add Ans: A/B/C/D)");
      else if (!b.options[b.correctIndex]?.trim()) issues.push(`Correct answer ${String.fromCharCode(65 + (b.correctIndex ?? 0))} is empty`);
      return issues;
    })();
    const needsReview = needs.length > 0;
    return {
      question,
      options: b.options,
      correctIndex: b.correctIndex,
      rawBlock: blockText,
      issues: needs,
      needsReview,
      confidence: needsReview ? 0.7 : 0.95,
      originalNumber: b.originalNumber,
    };
  });
}

export function parsePastedMcqs(pastedText: string): ParsedPasteMcq[] {
  if (!pastedText || !pastedText.trim()) return [];
  const normalized = pastedText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Try numbered split first (most reliable for pasted MCQs with numbering)
  const numberedBlocks = splitByNumbering(normalized);
  if (numberedBlocks && numberedBlocks.length > 0) {
    const parsed = numberedBlocks.map(parseSingleBlock);
    // If parsing via numbered gave reasonable results (at least 60% with options), use it
    const avgFilled = parsed.reduce((acc, p) => acc + p.options.filter((o) => o.trim()).length, 0) / parsed.length;
    if (avgFilled >= 2) {
      return parsed;
    }
    // Otherwise fallback
  }

  // Fallback: line-scan parser (handles missing numbering, inconsistent, blank lines)
  const viaLines = parseViaLineScan(normalized);
  if (viaLines.length > 0) return viaLines;

  // Last resort: try to treat whole text as single block
  return [parseSingleBlock(normalized)];
}

// Utility to recompute needsReview after edits
export function recomputeParsedMcq(mcq: ParsedPasteMcq): ParsedPasteMcq {
  const issues: string[] = [];
  if (!mcq.question || mcq.question.trim().length < 3) issues.push("Question text missing or too short");
  const filled = mcq.options.filter((o) => o.trim()).length;
  if (filled < 4) {
    const missing = mcq.options.map((o, i) => (!o.trim() ? String.fromCharCode(65 + i) : null)).filter(Boolean) as string[];
    if (missing.length) issues.push(`Missing option ${missing.join(", ")}`);
  }
  if (filled < 2) issues.push("At least 2 options required");
  if (mcq.correctIndex === null) issues.push("Correct answer not found (add Ans: A/B/C/D)");
  else if (mcq.correctIndex < 0 || mcq.correctIndex >= 4 || !mcq.options[mcq.correctIndex]?.trim()) issues.push(`Correct answer ${String.fromCharCode(65 + (mcq.correctIndex ?? 0))} is empty`);
  const needsReview = issues.length > 0;
  return { ...mcq, issues, needsReview, confidence: needsReview ? 0.7 : 0.96 };
}
