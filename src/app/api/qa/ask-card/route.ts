import { NextResponse } from "next/server";
import { fetchQaAskCardSettings } from "@/lib/qa-ask-card-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await fetchQaAskCardSettings();
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "no-store" },
  });
}
