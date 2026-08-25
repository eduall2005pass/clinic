import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { exec, isMysqlConfigured, query } from "@/lib/mysql";
import { itemInEnrolledCourse } from "@/lib/access";

export const dynamic = "force-dynamic";

const ITEM_TYPES = new Set(["class", "material"]);

function parseBody(body: unknown): { itemType: string; itemId: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const itemType = typeof record.itemType === "string" ? record.itemType : "";
  const itemId = typeof record.itemId === "string" ? record.itemId : "";
  if (!ITEM_TYPES.has(itemType) || !itemId || itemId.length > 64) return null;
  return { itemType, itemId };
}

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    // Only return favourites whose item is still inside an enrolled course.
    const rows = await query<{ item_type: string; item_id: string }[]>(
      `SELECT f.item_type, f.item_id
         FROM student_favourites f
        WHERE f.student_uid = ?
          AND (
            (f.item_type = 'class' AND EXISTS (
               SELECT 1 FROM course_classes cl
                JOIN course_chapters ch ON ch.id = cl.chapter_id
                JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
                JOIN enrollments e ON e.course_id = a.course_slug
                     AND e.student_uid = ? AND e.enrollment_status = 'active'
               WHERE cl.id = f.item_id))
            OR
            (f.item_type = 'material' AND EXISTS (
               SELECT 1 FROM course_materials m
                JOIN course_chapters ch ON ch.id = m.chapter_id
                JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
                JOIN enrollments e ON e.course_id = a.course_slug
                     AND e.student_uid = ? AND e.enrollment_status = 'active'
               WHERE m.id = f.item_id))
          )
        ORDER BY f.created_at DESC`,
      [user.uid, user.uid, user.uid],
    );
    return NextResponse.json({
      favourites: rows.map((row) => ({
        itemType: row.item_type,
        itemId: row.item_id,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load favourites." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "Invalid favourite item." }, { status: 400 });
  }
  try {
    // Course-wise permission check: the item must belong to a course the
    // student is ACTIVELY enrolled in — favourites cannot point outside.
    const allowed = await itemInEnrolledCourse(
      user.uid,
      parsed.itemType as "class" | "material",
      parsed.itemId,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Not available in your enrolled courses." },
        { status: 403 },
      );
    }
    // Toggle: remove if already a favourite, otherwise add.
    const deleted = await exec(
      "DELETE FROM student_favourites WHERE student_uid = ? AND item_type = ? AND item_id = ?",
      [user.uid, parsed.itemType, parsed.itemId],
    );
    if (deleted.affectedRows > 0) {
      return NextResponse.json({ isFavourite: false });
    }
    await exec(
      `INSERT IGNORE INTO student_favourites (student_uid, item_type, item_id)
       VALUES (?, ?, ?)`,
      [user.uid, parsed.itemType, parsed.itemId],
    );
    return NextResponse.json({ isFavourite: true });
  } catch {
    return NextResponse.json(
      { error: "Could not update favourites." },
      { status: 500 },
    );
  }
}
