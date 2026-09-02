import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  addFlow4Chapter,
  addFlow4Content,
  addFlow4Subject,
  deleteFlow4Chapter,
  deleteFlow4Content,
  deleteFlow4Subject,
  getFlow4Chapters,
  getFlow4Contents,
  getFlow4CourseData,
  getFlow4Subjects,
  reorderFlow4Chapters,
  reorderFlow4Contents,
  reorderFlow4Subjects,
  updateFlow4Chapter,
  updateFlow4Content,
  updateFlow4Subject,
} from "@/lib/flow4";

export const dynamic = "force-dynamic";

// GET ?course=slug → subjects
// GET ?course=slug&subject=subjectId → chapters
// GET ?course=slug&subject=subjectId&chapter=chapterId → contents
// GET ?course=slug&full=1 → full tree
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const course = url.searchParams.get("course") ?? "";
  if (!course) return NextResponse.json({ error: "Missing course." }, { status: 400 });
  const subject = url.searchParams.get("subject") ?? "";
  const chapter = url.searchParams.get("chapter") ?? "";
  const full = url.searchParams.get("full") === "1";

  try {
    if (full) {
      const data = await getFlow4CourseData(course);
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    if (chapter && subject) {
      const contents = await getFlow4Contents(chapter);
      return NextResponse.json({ contents }, { headers: { "Cache-Control": "no-store" } });
    }
    if (subject) {
      const chapters = await getFlow4Chapters(course, subject);
      return NextResponse.json({ chapters }, { headers: { "Cache-Control": "no-store" } });
    }
    const subjects = await getFlow4Subjects(course);
    return NextResponse.json({ subjects }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const action = String(body.action ?? "");
  const course = String(body.course ?? body.courseSlug ?? "");
  try {
    // Subject actions
    if (action === "add-subject") {
      if (!course) return NextResponse.json({ error: "Missing course." }, { status: 400 });
      const name = String(body.name ?? "");
      const subject = await addFlow4Subject(course, name);
      return NextResponse.json({ ok: true, subject });
    }
    if (action === "edit-subject") {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "");
      if (!id || !name) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      await updateFlow4Subject(id, name);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete-subject") {
      const id = String(body.id ?? "");
      if (!course || !id) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      await deleteFlow4Subject(course, id);
      return NextResponse.json({ ok: true });
    }
    if (action === "reorder-subjects") {
      const ids = Array.isArray(body.orderedIds) ? (body.orderedIds as string[]) : [];
      if (!course || ids.length === 0) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      await reorderFlow4Subjects(course, ids);
      return NextResponse.json({ ok: true });
    }
    // Chapter actions
    if (action === "add-chapter") {
      const subjectId = String(body.subjectId ?? body.subject ?? "");
      const name = String(body.name ?? "");
      if (!course || !subjectId || !name) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      const chapter = await addFlow4Chapter(course, subjectId, name);
      return NextResponse.json({ ok: true, chapter });
    }
    if (action === "edit-chapter") {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "");
      if (!id || !name) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      await updateFlow4Chapter(id, name);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete-chapter") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      await deleteFlow4Chapter(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "reorder-chapters") {
      const subjectId = String(body.subjectId ?? body.subject ?? "");
      const ids = Array.isArray(body.orderedIds) ? (body.orderedIds as string[]) : [];
      if (!subjectId || ids.length === 0) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      await reorderFlow4Chapters(subjectId, ids);
      return NextResponse.json({ ok: true });
    }
    // Content actions
    if (action === "add-content") {
      const chapterId = String(body.chapterId ?? body.chapter ?? "");
      const title = String(body.title ?? body.name ?? "");
      if (!chapterId || !title) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      const content = await addFlow4Content({
        chapterId,
        title,
        contentType: String(body.contentType ?? "class"),
        videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : null,
        fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : null,
        durationMinutes: Number(body.durationMinutes ?? 0),
      });
      return NextResponse.json({ ok: true, content });
    }
    if (action === "edit-content") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      await updateFlow4Content(id, {
        title: typeof body.title === "string" ? body.title : undefined,
        contentType: typeof body.contentType === "string" ? body.contentType : undefined,
        videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : body.videoUrl === null ? null : undefined,
        fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : body.fileUrl === null ? null : undefined,
        durationMinutes: body.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "delete-content") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      await deleteFlow4Content(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "reorder-contents") {
      const chapterId = String(body.chapterId ?? body.chapter ?? "");
      const ids = Array.isArray(body.orderedIds) ? (body.orderedIds as string[]) : [];
      if (!chapterId || ids.length === 0) return NextResponse.json({ error: "Missing data." }, { status: 400 });
      await reorderFlow4Contents(chapterId, ids);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Action failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
