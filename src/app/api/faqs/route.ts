import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchAllFaqs, fetchPublishedFaqs, saveFaqs } from "@/lib/faq-store";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 300;

export async function GET() {
  const faqs = await fetchPublishedFaqs();
  return NextResponse.json(
    { faqs },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Replace the full FAQ list (add / edit / delete / toggle / reorder). */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    faqs?: unknown;
  } | null;

  if (!body || !Array.isArray(body.faqs)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const faqs = await saveFaqs(
      body.faqs as Array<Record<string, unknown>>,
      admin.uid,
    );
    return NextResponse.json({ faqs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save FAQs.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
