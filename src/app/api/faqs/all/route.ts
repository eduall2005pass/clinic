import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { fetchAllFaqs } from "@/lib/faq-store";

export const dynamic = "force-dynamic";

/** Admin-only: full list including drafts. Public GET is cached separately. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const data = await fetchAllFaqs();
  return NextResponse.json({ faqs: data },
    { headers: { "Cache-Control": "no-store" } });
}
