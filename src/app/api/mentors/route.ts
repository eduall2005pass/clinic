import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchMentors, saveMentors } from "@/lib/mentors";

export const dynamic = "force-dynamic";

export async function GET() {
  const mentors = await fetchMentors();
  return NextResponse.json(
    { mentors },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    mentors?: unknown;
  } | null;

  if (!body || !Array.isArray(body.mentors)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const mentors = await saveMentors(
      body.mentors as Array<Record<string, unknown>>,
      admin.uid,
    );
    return NextResponse.json({ mentors });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save mentors.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
