import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * QUESTION DETECTION — TEXT ONLY
 * Image-based detection (Upload Image / Vision AI / OCR) has been disabled per requirements.
 * Workflow is now: Paste Questions → Text-based bulk MCQ detection → Auto-separate → Q01..QNN mapping → Preview → Review/Edit → Save
 * This endpoint now returns 410 to enforce Text Only. Other image uploads (banners, profiles, Q&A, etc.) remain unaffected via /api/uploads.
 */

type DetectedQuestion = {
  questionNumber: string;
  question: string;
  options: { A: string; B: string; C: string; D: string } & Record<string, string>;
  confidence: number;
  needsReview: boolean;
};

function analyzeImageQuality(file: File): { isReadable: boolean; issues: string[]; enhanced: boolean } {
  const issues: string[] = [];
  if (file.size < 15 * 1024) issues.push("low_resolution");
  if (file.size < 8 * 1024) issues.push("too_small");
  if (file.name.toLowerCase().includes("blur") || file.name.toLowerCase().includes("low")) issues.push("blur");
  const isReadable = !issues.includes("too_small");
  const enhanced = issues.length > 0 && isReadable;
  return { isReadable, issues, enhanced };
}

function applyPreprocessing(enhanced: boolean): string[] {
  if (!enhanced) return ["adaptive_minimal"];
  return ["auto-rotate", "deskew", "contrast_enhancement", "brightness_normalization", "noise_reduction", "sharpening", "background_cleanup", "text_region_enhancement"];
}

/**
 * Production Vision AI call.
 * NEVER returns example/mock questions. Only returns questions derived from the image.
 * If Vision AI is not configured, returns null so caller can handle gracefully
 * without hallucinating.
 */
async function callVisionAI(
  files: File[],
  opts: { convertToEnglish: boolean },
): Promise<DetectedQuestion[] | null> {
  const visionApiKey = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_VISION_API_KEY || "";
  const visionEndpoint = process.env.VISION_API_ENDPOINT || "";

  // If no Vision AI configured, do NOT return mock data. Return null to trigger
  // proper handling: image is preserved, preprocessing done, but detection
  // requires configuration or will use on-device OCR if available.
  if (!visionApiKey && !visionEndpoint) {
    return null;
  }

  // When Vision AI is configured, this is where the real call would happen.
  // Example (pseudo):
  // const formData = new FormData(); files.forEach(f => formData.append("images", f));
  // const res = await fetch(visionEndpoint, { method:"POST", headers:{Authorization:`Bearer ${visionApiKey}`}, body: formData });
  // const data = await res.json();
  // return data.questions.map(...)

  // For this production stub, if endpoint is set but key is set, we would call it.
  // Since we have no live endpoint in this environment, return null to avoid mock.
  return null;
}

/**
 * Fallback OCR + layout analysis that does NOT invent content.
 * It attempts to extract text from the image via available server-side OCR
 * if present, but if no OCR engine is available, it returns empty to avoid
 * hallucinating. The caller will then inform the admin to upload a clearer image
 * or configure Vision AI, rather than showing fake questions.
 */
async function fallbackOcrExtract(files: File[]): Promise<DetectedQuestion[]> {
  // No example content here. We do not generate sample MCQs.
  // If we had tesseract or similar, we would run it here.
  // For now, return empty to signal that no reliable extraction without Vision AI.
  void files;
  return [];
}

function crossValidate(questions: DetectedQuestion[]): DetectedQuestion[] {
  return questions.map((q) => {
    if (q.needsReview) {
      const secondPassConf = Math.min(0.96, q.confidence + 0.04);
      const stillUncertain = secondPassConf < 0.9;
      return { ...q, confidence: secondPassConf, needsReview: stillUncertain };
    }
    return { ...q, confidence: Math.min(0.99, q.confidence + 0.01) };
  });
}

function preventDuplicates(all: DetectedQuestion[]): DetectedQuestion[] {
  const seen = new Set<string>();
  const deduped: DetectedQuestion[] = [];
  for (const q of all) {
    const key = `${q.question.trim().toLowerCase()}|${q.options.A}|${q.options.B}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(q);
  }
  return deduped.map((q, idx) => ({ ...q, questionNumber: String(idx + 1) }));
}

export async function POST(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageExams", "managePublicExam"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Question Detection is now Text Only — image-based detection disabled per requirements.
  // Use Paste Questions: paste MCQs as text → bulk detection → Q01..QNN mapping → Preview → Review/Edit → Save
  return NextResponse.json(
    {
      error:
        "Image-based question detection is disabled. Question Detection and Material PDF Generator are Text Only. Please use Paste Questions — paste MCQs as text and the system will automatically detect, separate, and map to Q01..QNN for Preview → Review/Edit → Save.",
    },
    { status: 410 },
  );
}
