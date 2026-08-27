import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { fetchClasses, saveClass, deleteClass, reorderClasses } from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const chapterId = request.nextUrl.searchParams.get("chapterId") ?? undefined;
  const classes = await fetchClasses(chapterId || undefined);
  return NextResponse.json(
    { classes },
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
    const classes = await saveClass(body);
    await logAdminAction(admin, "class.save", String(body.id ?? body.title ?? ""), request);
    return NextResponse.json({ classes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the class.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Change display order: { order: [id, …] }. */
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
  const classes = await reorderClasses(body.order as string[]);
  await logAdminAction(admin, "class.update", "reorder", request);
  return NextResponse.json({ classes });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing class id." }, { status: 400 });
  }
  const classes = await deleteClass(body.id);
  await logAdminAction(admin, "class.delete", body.id, request);
  return NextResponse.json({ classes });
}
