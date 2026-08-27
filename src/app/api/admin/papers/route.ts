import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchPapers,
  savePaper,
  updatePaper,
  reorderPapers,
  deletePaper,
  setChapterPaper,
} from "@/lib/course-papers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
  const papers = await fetchPapers(subjectId || undefined);
  return NextResponse.json(
    { papers },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const papers = await savePaper(body);
    await logAdminAction(admin, "paper.save", String(body.id ?? body.name ?? ""), request);
    return NextResponse.json({ papers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the paper.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  // Chapter → paper assignment: { chapterId, paperId } (paperId null = none).
  if (typeof body.chapterId === "string" && body.chapterId) {
    try {
      await setChapterPaper(
        body.chapterId,
        typeof body.paperId === "string" && body.paperId ? body.paperId : null,
      );
      await logAdminAction(admin, "chapter.update", body.chapterId, request);
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign the paper.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing paper id." }, { status: 400 });
  }
  try {
    const patch: { name?: string; isActive?: boolean } = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    const papers = await updatePaper(body.id, patch);
    await logAdminAction(admin, "paper.update", body.id, request);
    return NextResponse.json({ papers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the paper.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
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
    const papers = await reorderPapers(body.order as string[]);
    await logAdminAction(admin, "paper.update", "reorder", request);
    return NextResponse.json({ papers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder papers.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing paper id." }, { status: 400 });
  }
  try {
    const papers = await deletePaper(body.id);
    await logAdminAction(admin, "paper.delete", body.id, request);
    return NextResponse.json({ papers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete the paper.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
