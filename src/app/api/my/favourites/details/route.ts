import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured, query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["class", "exam", "material", "qa"]);

type ClassFavRow = {
  item_id: string;
  title: string;
  video_url: string | null;
  duration_minutes: number;
  chapter_name: string;
  subject_name: string;
  course_slug: string;
  course_name: string;
  created_at: Date | string;
};

type ExamFavRow = {
  item_id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
  chapter_name: string | null;
  subject_name: string | null;
  course_slug: string | null;
  course_name: string | null;
  created_at: Date | string;
};

type MaterialFavRow = {
  item_id: string;
  title: string;
  material_type: string;
  file_url: string;
  chapter_name: string;
  subject_name: string;
  course_slug: string;
  course_name: string;
  created_at: Date | string;
};

type QaFavRow = {
  item_id: string;
  text: string;
  status: string;
  subject_name: string | null;
  category_name: string | null;
  course_name: string | null;
  created_at: Date | string;
  answered_at: Date | string | null;
  has_picture: number | null;
};

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const type = request.nextUrl.searchParams.get("type");
  if (!type || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type. Use class|exam|material|qa." }, { status: 400 });
  }

  try {
    if (type === "class") {
      const rows = await query<ClassFavRow[]>(
        `SELECT f.item_id, cl.title, cl.video_url, cl.duration_minutes,
                ch.name AS chapter_name, s.name AS subject_name,
                a.course_slug, cc.name AS course_name, f.created_at
           FROM student_favourites f
           JOIN course_classes cl ON cl.id = f.item_id AND cl.is_active = 1
           JOIN course_chapters ch ON ch.id = cl.chapter_id AND ch.is_active = 1
           JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
           JOIN catalog_courses cc ON cc.slug = a.course_slug
           JOIN enrollments e ON e.course_id = a.course_slug AND e.student_uid = ? AND e.enrollment_status = 'active'
          WHERE f.student_uid = ? AND f.item_type = 'class'
          ORDER BY f.created_at DESC`,
        [user.uid, user.uid],
      );
      return NextResponse.json({ items: rows });
    }

    if (type === "material") {
      const rows = await query<MaterialFavRow[]>(
        `SELECT f.item_id, m.title, m.material_type, m.file_url,
                ch.name AS chapter_name, s.name AS subject_name,
                a.course_slug, cc.name AS course_name, f.created_at
           FROM student_favourites f
           JOIN course_materials m ON m.id = f.item_id AND m.is_active = 1
           JOIN course_chapters ch ON ch.id = m.chapter_id AND ch.is_active = 1
           JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
           JOIN catalog_courses cc ON cc.slug = a.course_slug
           JOIN enrollments e ON e.course_id = a.course_slug AND e.student_uid = ? AND e.enrollment_status = 'active'
          WHERE f.student_uid = ? AND f.item_type = 'material'
          ORDER BY f.created_at DESC`,
        [user.uid, user.uid],
      );
      return NextResponse.json({ items: rows });
    }

    if (type === "exam") {
      const rows = await query<ExamFavRow[]>(
        `SELECT f.item_id, ex.title, ex.duration_minutes, ex.total_marks,
                ch.name AS chapter_name, s.name AS subject_name,
                a.course_slug, cc.name AS course_name, f.created_at
           FROM student_favourites f
           JOIN exams ex ON ex.id = f.item_id AND ex.status = 'published'
           LEFT JOIN course_chapters ch ON ch.id = ex.chapter_id
           LEFT JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
           LEFT JOIN catalog_courses cc ON cc.slug = a.course_slug
          WHERE f.student_uid = ? AND f.item_type = 'exam'
            AND (
              (ex.chapter_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM enrollments e WHERE e.course_id = a.course_slug AND e.student_uid = ? AND e.enrollment_status = 'active'
              ))
              OR
              (ex.chapter_id IS NULL AND EXISTS (SELECT 1 FROM enrollments e2 WHERE e2.student_uid = ? AND e2.enrollment_status = 'active'))
            )
          ORDER BY f.created_at DESC`,
        [user.uid, user.uid, user.uid],
      );
      return NextResponse.json({ items: rows });
    }

    if (type === "qa") {
      try {
        const rows = await query<QaFavRow[]>(
          `SELECT f.item_id, q.text, q.status,
                  s.name AS subject_name,
                  q.category_id AS category_name, q.course_id AS course_name,
                  q.created_at, q.answered_at,
                  CASE WHEN q.image_url IS NOT NULL AND q.image_url <> '' THEN 1 ELSE 0 END AS has_picture
             FROM student_favourites f
             JOIN qa_questions q ON q.question_id = f.item_id
             LEFT JOIN qa_subjects s ON s.subject_id = q.subject_id
            WHERE f.student_uid = ? AND f.item_type = 'qa'
            ORDER BY f.created_at DESC`,
          [user.uid],
        );
        return NextResponse.json({ items: rows });
      } catch {
        const rows = await query<QaFavRow[]>(
          `SELECT f.item_id, q.text, q.status,
                  s.name AS subject_name,
                  NULL AS category_name, NULL AS course_name,
                  q.created_at, q.answered_at, 0 AS has_picture
             FROM student_favourites f
             JOIN qa_questions q ON q.question_id = f.item_id
             LEFT JOIN qa_subjects s ON s.subject_id = q.subject_id
            WHERE f.student_uid = ? AND f.item_type = 'qa'
            ORDER BY f.created_at DESC`,
          [user.uid],
        );
        return NextResponse.json({ items: rows });
      }
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error("[favourites/details] failed:", error);
    return NextResponse.json({ error: "Could not load favourites." }, { status: 500 });
  }
}
