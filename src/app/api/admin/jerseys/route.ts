import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchJerseys,
  saveJersey,
  deleteJersey,
} from "@/lib/content-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const jerseys = await fetchJerseys();
  return NextResponse.json(
    { jerseys },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const jerseys = await saveJersey(body);
    await logAdminAction(admin, body.image ? "jersey.upload" : "jersey.save", String(body.name ?? body.id ?? ""), request);
    return NextResponse.json({ jerseys });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the jersey.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing jersey id." }, { status: 400 });
  }
  await deleteJersey(body.id);
  await logAdminAction(admin, "jersey.delete", body.id, request);
  const jerseys = await fetchJerseys();
  return NextResponse.json({ jerseys });
}
