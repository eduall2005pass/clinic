import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { fetchClasses, saveClass, deleteClass } from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
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
  const admin = await requirePermission(request, "manageCourses");
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

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
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
