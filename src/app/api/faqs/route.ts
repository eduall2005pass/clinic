import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchAllFaqs, fetchPublishedFaqs, saveFaqs } from "@/lib/faq-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const faqs = await fetchAllFaqs();
    return NextResponse.json(
      { faqs },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const faqs = await fetchPublishedFaqs();
  return NextResponse.json(
    { faqs },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Replace the full FAQ list (add / edit / delete / toggle / reorder). */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
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
