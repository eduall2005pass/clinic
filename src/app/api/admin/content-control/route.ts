import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  addTypeChapter,
  deleteTypeChapter,
  ensureTypes,
  getTypeChapters,
  updateTypeChapter,
  type CtypeScope,
} from "@/lib/content-control";
import { exec as execRaw, query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

function scopeFrom(body: Record<string, unknown>): CtypeScope | null {
  const courseSlug = typeof body.courseSlug === "string" ? body.courseSlug : "";
  if (!courseSlug) return null;
  return {
    courseSlug,
    subjectId: typeof body.subjectId === "string" && body.subjectId ? body.subjectId : "",
    paperId: typeof body.paperId === "string" && body.paperId ? body.paperId : "",
  };
}

/**
 * Course Content Control API.
 * GET  ?course=SLUG                       → structure (mode + types)
 * GET  ?course=SLUG&ctype=class[&subject=&paper=] → chapters of one type
 * POST {action, …}                        → add-chapter / add-type / rename-type
 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const slug = url.searchParams.get("course") ?? "";
  if (!slug) return NextResponse.json({ error: "Missing course." }, { status: 400 });

  const ctype = url.searchParams.get("ctype");
  const scope: CtypeScope = {
    courseSlug: slug,
    subjectId: url.searchParams.get("subject") ?? "",
    paperId: url.searchParams.get("paper") ?? "",
  };

  try {
    if (ctype) {
      const chapters = await getTypeChapters(scope, ctype);
      return NextResponse.json({ chapters }, { headers: { "Cache-Control": "no-store" } });
    }
    const types = await ensureTypes(scope);
    // Structure mode: subjects assigned? papers under first subject?
    const subjects = await query<{ id: string; name: string }[]>(
      `SELECT s.id, s.name FROM course_subjects s
         JOIN course_subject_assignments a ON a.subject_id = s.id
        WHERE a.course_slug = ? AND s.is_active = 1 ORDER BY s.sort_order`,
      [slug],
    );
    let papers: Array<{ id: string; name: string; subjectId: string }> = [];
    if (subjects.length > 0) {
      papers = await query(
        `SELECT id, name, subject_id AS subjectId FROM course_papers
          WHERE is_active = 1 ORDER BY sort_order`,
      );
      papers = papers.filter((p) => subjects.some((s2) => s2.id === p.subjectId));
    }
    const mode =
      papers.length > 0 ? "papers" : subjects.length > 0 ? "subjects" : "direct";
    return NextResponse.json(
      { mode, types, subjects, papers },
      { headers: { "Cache-Control": "no-store" } },
    );
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
  try {
    if (action === "add-chapter" || action === "rename-chapter") {
      const scope = scopeFrom(body);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!scope || !name || name.length > 255) {
        return NextResponse.json({ error: "Course and chapter name required." }, { status: 400 });
      }
      if (action === "add-chapter") {
        const id = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await addTypeChapter(scope, String(body.ctype ?? "class"), name, id);
        return NextResponse.json({ ok: true, id });
      }
      const id = typeof body.id === "string" ? body.id : "";
      const sortOrder = Number(body.sortOrder) || 0;
      const updated = await updateTypeChapter(id, name, sortOrder);
      return NextResponse.json({ ok: updated });
    }

    if (action === "delete-chapter") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      await deleteTypeChapter(id);
      return NextResponse.json({ ok: true });
    }

    if (action === "add-type") {
      const scope = scopeFrom(body);
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 64) : "";
      const typeKey = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32);
      if (!scope || !name || !typeKey) {
        return NextResponse.json({ error: "Course and type name required." }, { status: 400 });
      }
      await execInsert(scope, typeKey, name);
      return NextResponse.json({ ok: true, typeKey });
    }

    if (action === "rename-type") {
      const scope = scopeFrom(body);
      const typeKey = typeof body.typeKey === "string" ? body.typeKey : "";
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 64) : "";
      if (!scope || !typeKey || !name) {
        return NextResponse.json({ error: "Missing data." }, { status: 400 });
      }
      await execRaw(
        `UPDATE course_content_types SET name = ?
          WHERE course_slug = ? AND subject_id <=> ? AND paper_id <=> ? AND type_key = ?`,
        [name, scope.courseSlug, scope.subjectId ?? "", scope.paperId ?? "", typeKey],
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}

async function execInsert(scope: CtypeScope, typeKey: string, name: string) {
  const rows = await query<{ next: number }[]>(
    "SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM course_content_types WHERE course_slug = ?",
    [scope.courseSlug],
  );
  await execRaw(
    `INSERT IGNORE INTO course_content_types
       (course_slug, subject_id, paper_id, type_key, name, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [scope.courseSlug, scope.subjectId ?? "", scope.paperId ?? "", typeKey, name, Number(rows[0]?.next ?? 1)],
  );
}
