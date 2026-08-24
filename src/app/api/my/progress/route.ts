import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { exec, isMysqlConfigured, query } from "@/lib/mysql";
import { getMyCourseProgress } from "@/lib/my-learning";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const courses = await getMyCourseProgress(user.uid);
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json(
      { error: "Could not load your course progress." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    classId?: unknown;
    completed?: unknown;
    lastSeenSeconds?: unknown;
  } | null;
  const classId = typeof body?.classId === "string" ? body.classId : "";
  if (!classId || classId.length > 64) {
    return NextResponse.json({ error: "Invalid class id." }, { status: 400 });
  }
  // Only accept progress for classes that belong to a course the student is
  // actively enrolled in.
  try {
    const allowed = await query<{ found: number }[]>(
      `SELECT 1 AS found
         FROM course_classes cl
         JOIN course_chapters ch ON ch.id = cl.chapter_id
         JOIN course_subject_assignments a ON a.subject_id = ch.subject_id
         JOIN enrollments e
           ON e.course_id = a.course_slug AND e.student_uid = ?
        WHERE cl.id = ? AND e.enrollment_status = 'active'
        LIMIT 1`,
      [user.uid, classId],
    );
    if (allowed.length === 0) {
      return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
    }
    await exec(
      `INSERT INTO student_class_progress (student_uid, class_id, completed, last_seen_seconds)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         completed = VALUES(completed),
         last_seen_seconds = GREATEST(last_seen_seconds, VALUES(last_seen_seconds))`,
      [
        user.uid,
        classId,
        body?.completed === true ? 1 : 0,
        typeof body?.lastSeenSeconds === "number" &&
        Number.isFinite(body.lastSeenSeconds) &&
        body.lastSeenSeconds >= 0
          ? Math.floor(body.lastSeenSeconds)
          : 0,
      ],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not save progress." },
      { status: 500 },
    );
  }
}
