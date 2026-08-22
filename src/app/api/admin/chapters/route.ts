import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  fetchChapters,
  saveChapter,
  deleteChapter,
  reorderChapters,
  updateChapter,
} from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
  const chapters = await fetchChapters(subjectId || undefined);
  return NextResponse.json(
    { chapters },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create a chapter: { name, subjectId }. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const chapters = await saveChapter(body);
    return NextResponse.json({ chapters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the chapter.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Single-chapter update: { id, name?, subjectId?, isActive? }. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing chapter id." }, { status: 400 });
  }
  try {
    const patch: Parameters<typeof updateChapter>[1] = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.subjectId === "string") patch.subjectId = body.subjectId;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    const chapters = await updateChapter(body.id, patch);
    return NextResponse.json({ chapters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the chapter.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Change display order: { order: [id, …] }. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { order?: unknown }
    | null;
  if (
    !body ||
    !Array.isArray(body.order) ||
    !body.order.every((item) => typeof item === "string" && item.length > 0)
  ) {
    return NextResponse.json(
      { error: "Invalid request body — expected { order: [id, …] }." },
      { status: 400 },
    );
  }
  try {
    const chapters = await reorderChapters(body.order as string[]);
    return NextResponse.json({ chapters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder chapters.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing chapter id." }, { status: 400 });
  }
  const chapters = await deleteChapter(body.id);
  return NextResponse.json({ chapters });
}
